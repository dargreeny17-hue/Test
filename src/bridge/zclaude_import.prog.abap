*&---------------------------------------------------------------------*
*& Report ZCLAUDE_IMPORT
*&---------------------------------------------------------------------*
*& Clipboard bridge, import side.
*&
*& 1. Copy a bundle (text between *@@BUNDLE and *@@END) to the
*&    clipboard and run this report (F8).
*& 2. The report saves the programs/includes of the bundle, runs the
*&    syntax check and puts a compact result back into the clipboard.
*& 3. Paste the result back to the developer.
*&
*& Modes:
*&   P_IMP  - import + syntax check
*&   P_CHK  - syntax check only, nothing is saved
*&   P_UNDO - restore the sources that the last import overwrote
*&
*& Safety:
*&   - only Z*/Y* programs, S_DEVELOP is checked, editor lock ESRDIRE
*&   - objects of another package are refused unless P_OTHER is set
*&   - an incomplete bundle (no *@@END) is refused as a whole
*&   - previous sources are backed up to INDX(ZC) for P_UNDO
*&
*& Written in classic syntax on purpose (runs on old releases too).
*& Bundle format: docs/bundle-format.md in the project repository.
*&---------------------------------------------------------------------*
REPORT zclaude_import LINE-SIZE 255.

TYPES: ty_flag            TYPE c LENGTH 1,
       ty_clip_line(1000) TYPE c,
       ty_clip            TYPE STANDARD TABLE OF ty_clip_line
                               WITH DEFAULT KEY,
       ty_src_line(255)   TYPE c,
       ty_source          TYPE STANDARD TABLE OF ty_src_line
                               WITH DEFAULT KEY,
       ty_textpool        TYPE STANDARD TABLE OF textpool
                               WITH DEFAULT KEY,
       ty_names           TYPE STANDARD TABLE OF progname
                               WITH DEFAULT KEY.

TYPES: BEGIN OF ty_object,
         objtype   TYPE c LENGTH 4,
         name      TYPE progname,
         subc      TYPE trdir-subc,
         main      TYPE progname,
         title     TYPE c LENGTH 70,
         source    TYPE ty_source,
         texts     TYPE ty_textpool,
         exists    TYPE ty_flag,
         devclass  TYPE devclass,
       END OF ty_object,
       ty_objects TYPE STANDARD TABLE OF ty_object WITH DEFAULT KEY.

TYPES: BEGIN OF ty_backup,
         name    TYPE progname,
         existed TYPE ty_flag,
         source  TYPE ty_source,
         texts   TYPE ty_textpool,
       END OF ty_backup,
       ty_backups TYPE STANDARD TABLE OF ty_backup WITH DEFAULT KEY.

SELECTION-SCREEN BEGIN OF BLOCK mode WITH FRAME.
PARAMETERS: p_imp  RADIOBUTTON GROUP mode DEFAULT 'X',
            p_chk  RADIOBUTTON GROUP mode,
            p_undo RADIOBUTTON GROUP mode.
SELECTION-SCREEN END OF BLOCK mode.

SELECTION-SCREEN BEGIN OF BLOCK tgt WITH FRAME.
PARAMETERS: p_devc  TYPE devclass DEFAULT '$TMP' OBLIGATORY,
            p_trkor TYPE trkorr,
            p_other AS CHECKBOX.
SELECTION-SCREEN END OF BLOCK tgt.

*----------------------------------------------------------------------*
CLASS lcl_bridge DEFINITION FINAL.
  PUBLIC SECTION.
    METHODS run.

  PRIVATE SECTION.
    DATA: mt_result  TYPE ty_clip,
          mt_objects TYPE ty_objects,
          mv_errors  TYPE i.

    METHODS out
      IMPORTING iv_text TYPE csequence.
    METHODS error
      IMPORTING iv_text TYPE csequence.
    METHODS add_header.
    METHODS read_clipboard
      RETURNING value(rt_lines) TYPE ty_clip.
    METHODS parse_bundle
      IMPORTING it_lines TYPE ty_clip.
    METHODS parse_object_header
      IMPORTING iv_line   TYPE ty_clip_line
      CHANGING  cs_object TYPE ty_object.
    METHODS parse_text_line
      IMPORTING iv_line   TYPE ty_clip_line
      CHANGING  cs_object TYPE ty_object.
    METHODS validate_object
      CHANGING cs_object TYPE ty_object.
    METHODS check_authority
      IMPORTING iv_name     TYPE progname
                iv_devclass TYPE devclass
                iv_actvt    TYPE c
      RETURNING value(rv_ok) TYPE ty_flag.
    METHODS import_all.
    METHODS lock
      IMPORTING iv_name     TYPE progname
      RETURNING value(rv_ok) TYPE ty_flag.
    METHODS unlock
      IMPORTING iv_name TYPE progname.
    METHODS corr_insert
      IMPORTING iv_name     TYPE progname
                iv_devclass TYPE devclass
      RETURNING value(rv_ok) TYPE ty_flag.
    METHODS save_object
      IMPORTING is_object TYPE ty_object.
    METHODS merge_texts
      IMPORTING is_object   TYPE ty_object
      RETURNING value(rt_tp) TYPE ty_textpool.
    METHODS syntax_check_all.
    METHODS syntax_check
      IMPORTING iv_program TYPE progname
                it_source  TYPE ty_source.
    METHODS undo_last.
    METHODS backup_id
      RETURNING value(rv_id) TYPE indx-srtfd.
    METHODS finish.
ENDCLASS.

*----------------------------------------------------------------------*
CLASS lcl_bridge IMPLEMENTATION.

  METHOD run.
    DATA lt_lines TYPE ty_clip.

    add_header( ).

    IF p_undo = 'X'.
      undo_last( ).
    ELSE.
      lt_lines = read_clipboard( ).
      IF mv_errors = 0.
        parse_bundle( lt_lines ).
      ENDIF.
      IF mv_errors = 0 AND p_imp = 'X'.
        import_all( ).
      ENDIF.
      IF mv_errors = 0.
        syntax_check_all( ).
      ENDIF.
    ENDIF.

    finish( ).
  ENDMETHOD.

  METHOD out.
    DATA lv_line TYPE ty_clip_line.
    lv_line = iv_text.
    APPEND lv_line TO mt_result.
  ENDMETHOD.

  METHOD error.
    DATA lv_text TYPE string.
    CONCATENATE 'ERROR' iv_text INTO lv_text SEPARATED BY space.
    out( lv_text ).
    mv_errors = mv_errors + 1.
  ENDMETHOD.

  METHOD add_header.
    DATA: lv_rel  TYPE cvers-release,
          lv_sp   TYPE cvers-extrelease,
          lv_mode TYPE string,
          lv_line TYPE string.

    SELECT SINGLE release extrelease FROM cvers
      INTO (lv_rel, lv_sp)
      WHERE component = 'SAP_BASIS'.

    IF p_undo = 'X'.
      lv_mode = 'undo'.
    ELSEIF p_chk = 'X'.
      lv_mode = 'check'.
    ELSE.
      lv_mode = 'import'.
    ENDIF.

    CONCATENATE '*@@RESULT v1 mode=' lv_mode
                ' system=' sy-sysid ' client=' sy-mandt
                ' basis=' lv_rel ' sp=' lv_sp
                ' date=' sy-datum ' time=' sy-uzeit
                INTO lv_line.
    out( lv_line ).
  ENDMETHOD.

  METHOD read_clipboard.
    DATA lv_len TYPE i.

    CALL METHOD cl_gui_frontend_services=>clipboard_import
      IMPORTING
        data                 = rt_lines
        length               = lv_len
      EXCEPTIONS
        cntl_error           = 1
        error_no_gui         = 2
        not_supported_by_gui = 3
        OTHERS               = 4.
    IF sy-subrc <> 0.
      error( 'clipboard could not be read (SAP GUI clipboard access?)' ).
    ELSEIF rt_lines IS INITIAL.
      error( 'clipboard is empty' ).
    ENDIF.
  ENDMETHOD.

  METHOD parse_bundle.
    DATA: ls_object   TYPE ty_object,
          lv_work     TYPE ty_clip_line,
          lv_src      TYPE ty_src_line,
          lv_len      TYPE i,
          lv_started  TYPE ty_flag,
          lv_in_obj   TYPE ty_flag,
          lv_in_texts TYPE ty_flag,
          lv_ended    TYPE ty_flag,
          lv_count    TYPE i,
          lv_text     TYPE string,
          lv_num      TYPE c LENGTH 10.
    FIELD-SYMBOLS <lv_line> TYPE ty_clip_line.

    LOOP AT it_lines ASSIGNING <lv_line>.
      lv_work = <lv_line>.
      SHIFT lv_work LEFT DELETING LEADING space.

      IF lv_work(3) = '*@@'.
        IF lv_work(9) = '*@@BUNDLE'.
          lv_started = 'X'.
        ELSEIF lv_started IS INITIAL.
          " text before the bundle start is ignored
        ELSEIF lv_work(9) = '*@@OBJECT'.
          IF lv_in_obj = 'X'.
            APPEND ls_object TO mt_objects.
          ENDIF.
          CLEAR: ls_object, lv_in_texts.
          lv_in_obj = 'X'.
          parse_object_header( EXPORTING iv_line   = lv_work
                               CHANGING  cs_object = ls_object ).
        ELSEIF lv_work(8) = '*@@TEXTS'.
          lv_in_texts = 'X'.
        ELSEIF lv_work(6) = '*@@END'.
          IF lv_in_obj = 'X'.
            APPEND ls_object TO mt_objects.
          ENDIF.
          lv_ended = 'X'.
          EXIT.
        ELSE.
          CONCATENATE 'unknown marker:' lv_work INTO lv_text
            SEPARATED BY space.
          error( lv_text ).
        ENDIF.
        CONTINUE.
      ENDIF.

      IF lv_started IS INITIAL OR lv_in_obj IS INITIAL.
        CONTINUE.
      ENDIF.

      IF lv_in_texts = 'X'.
        IF lv_work IS NOT INITIAL.
          parse_text_line( EXPORTING iv_line   = lv_work
                           CHANGING  cs_object = ls_object ).
        ENDIF.
      ELSE.
        lv_len = strlen( <lv_line> ).
        IF lv_len > 255.
          lv_count = lines( ls_object-source ) + 1.
          lv_num = lv_count.
          CONDENSE lv_num.
          CONCATENATE ls_object-name 'line' lv_num
                      'is longer than 255 characters'
                      INTO lv_text SEPARATED BY space.
          error( lv_text ).
        ENDIF.
        lv_src = <lv_line>.
        APPEND lv_src TO ls_object-source.
      ENDIF.
    ENDLOOP.

    IF lv_started IS INITIAL.
      error( 'no *@@BUNDLE marker found in clipboard' ).
    ELSEIF lv_ended IS INITIAL.
      error( 'no *@@END marker - bundle incomplete, nothing imported' ).
    ELSEIF mt_objects IS INITIAL.
      error( 'bundle contains no objects' ).
    ENDIF.

    FIELD-SYMBOLS <ls_object> TYPE ty_object.
    LOOP AT mt_objects ASSIGNING <ls_object>.
      validate_object( CHANGING cs_object = <ls_object> ).
    ENDLOOP.
  ENDMETHOD.

  METHOD parse_object_header.
    " *@@OBJECT PROG ZNAME TYPE=1 MAIN=ZMAIN TITLE=free text till EOL
    DATA: lv_rest  TYPE string,
          lv_head  TYPE string,
          lv_title TYPE string,
          lt_tok   TYPE STANDARD TABLE OF string WITH DEFAULT KEY,
          lv_tok   TYPE string,
          lv_key   TYPE string,
          lv_val   TYPE string,
          lv_idx   TYPE i.

    lv_rest = iv_line+9.
    SPLIT lv_rest AT 'TITLE=' INTO lv_head lv_title.
    CONDENSE lv_head.
    SPLIT lv_head AT space INTO TABLE lt_tok.

    LOOP AT lt_tok INTO lv_tok.
      lv_idx = sy-tabix.
      CASE lv_idx.
        WHEN 1.
          cs_object-objtype = lv_tok.
        WHEN 2.
          cs_object-name = lv_tok.
        WHEN OTHERS.
          SPLIT lv_tok AT '=' INTO lv_key lv_val.
          TRANSLATE lv_key TO UPPER CASE.
          CASE lv_key.
            WHEN 'TYPE'.
              cs_object-subc = lv_val.
            WHEN 'MAIN'.
              cs_object-main = lv_val.
          ENDCASE.
      ENDCASE.
    ENDLOOP.

    SHIFT lv_title LEFT DELETING LEADING space.
    cs_object-title = lv_title.
    TRANSLATE cs_object-objtype TO UPPER CASE.
    TRANSLATE cs_object-name    TO UPPER CASE.
    TRANSLATE cs_object-main    TO UPPER CASE.
    TRANSLATE cs_object-subc    TO UPPER CASE.
    IF cs_object-subc IS INITIAL.
      cs_object-subc = '1'.
    ENDIF.
  ENDMETHOD.

  METHOD parse_text_line.
    " I 001 text symbol   /   S P_PARAM selection text   /   R title
    DATA: lv_id   TYPE string,
          lv_key  TYPE string,
          lv_text TYPE string,
          lv_rest TYPE string,
          ls_tp   TYPE textpool.

    SPLIT iv_line AT space INTO lv_id lv_rest.
    TRANSLATE lv_id TO UPPER CASE.
    SHIFT lv_rest LEFT DELETING LEADING space.

    CASE lv_id.
      WHEN 'I' OR 'S'.
        SPLIT lv_rest AT space INTO lv_key lv_text.
        SHIFT lv_text LEFT DELETING LEADING space.
        TRANSLATE lv_key TO UPPER CASE.
        ls_tp-id  = lv_id.
        ls_tp-key = lv_key.
        IF lv_id = 'S'.
          " selection texts: 8 leading flag characters, then the text
          ls_tp-entry+8 = lv_text.
        ELSE.
          ls_tp-entry = lv_text.
        ENDIF.
      WHEN 'R'.
        ls_tp-id    = 'R'.
        ls_tp-entry = lv_rest.
      WHEN OTHERS.
        CONCATENATE 'WARN' cs_object-name 'text line ignored:' iv_line
          INTO lv_text SEPARATED BY space.
        out( lv_text ).
        RETURN.
    ENDCASE.

    ls_tp-length = strlen( ls_tp-entry ).
    APPEND ls_tp TO cs_object-texts.
  ENDMETHOD.

  METHOD validate_object.
    DATA: lv_text TYPE string,
          lv_subc TYPE trdir-subc.

    IF cs_object-objtype <> 'PROG'.
      CONCATENATE cs_object-objtype cs_object-name
                  '- only PROG objects can be imported'
                  INTO lv_text SEPARATED BY space.
      error( lv_text ).
      RETURN.
    ENDIF.

    IF cs_object-name IS INITIAL.
      error( 'object without name' ).
      RETURN.
    ENDIF.

    IF cs_object-name(1) <> 'Z' AND cs_object-name(1) <> 'Y'.
      CONCATENATE cs_object-name '- only Z*/Y* names are allowed'
        INTO lv_text SEPARATED BY space.
      error( lv_text ).
      RETURN.
    ENDIF.

    IF cs_object-subc <> '1' AND cs_object-subc <> 'I'
        AND cs_object-subc <> 'S' AND cs_object-subc <> 'M'.
      CONCATENATE cs_object-name 'TYPE=' cs_object-subc
                  'not supported (use 1, I, S or M)'
                  INTO lv_text SEPARATED BY space.
      error( lv_text ).
      RETURN.
    ENDIF.

    IF cs_object-source IS INITIAL.
      CONCATENATE cs_object-name '- empty source'
        INTO lv_text SEPARATED BY space.
      error( lv_text ).
      RETURN.
    ENDIF.

    SELECT SINGLE subc FROM trdir INTO lv_subc
      WHERE name = cs_object-name.
    IF sy-subrc = 0.
      cs_object-exists = 'X'.
      SELECT SINGLE devclass FROM tadir INTO cs_object-devclass
        WHERE pgmid    = 'R3TR'
          AND object   = 'PROG'
          AND obj_name = cs_object-name.
      IF lv_subc <> cs_object-subc.
        CONCATENATE 'WARN' cs_object-name 'exists with TYPE=' lv_subc
                    '- type is kept'
                    INTO lv_text SEPARATED BY space.
        out( lv_text ).
      ENDIF.
      IF cs_object-devclass <> p_devc AND p_other IS INITIAL
          AND p_imp = 'X'.
        CONCATENATE cs_object-name 'belongs to package'
                    cs_object-devclass
                    '- set P_OTHER to allow changing it'
                    INTO lv_text SEPARATED BY space.
        error( lv_text ).
      ENDIF.
    ELSE.
      cs_object-devclass = p_devc.
      IF cs_object-subc = 'I' AND cs_object-main IS INITIAL.
        CONCATENATE 'WARN' cs_object-name
                    'new include without MAIN= - it will not be checked'
                    INTO lv_text SEPARATED BY space.
        out( lv_text ).
      ENDIF.
    ENDIF.
  ENDMETHOD.

  METHOD check_authority.
    DATA lv_objtype TYPE c LENGTH 4 VALUE 'PROG'.

    AUTHORITY-CHECK OBJECT 'S_DEVELOP'
      ID 'DEVCLASS' FIELD iv_devclass
      ID 'OBJTYPE'  FIELD lv_objtype
      ID 'OBJNAME'  FIELD iv_name
      ID 'P_GROUP'  DUMMY
      ID 'ACTVT'    FIELD iv_actvt.
    IF sy-subrc = 0.
      rv_ok = 'X'.
    ENDIF.
  ENDMETHOD.

  METHOD lock.
    CALL FUNCTION 'ENQUEUE_ESRDIRE'
      EXPORTING
        name           = iv_name
      EXCEPTIONS
        foreign_lock   = 1
        system_failure = 2
        OTHERS         = 3.
    IF sy-subrc = 0.
      rv_ok = 'X'.
    ENDIF.
  ENDMETHOD.

  METHOD unlock.
    CALL FUNCTION 'DEQUEUE_ESRDIRE'
      EXPORTING
        name = iv_name.
  ENDMETHOD.

  METHOD corr_insert.
    " registers the object in the package / transport request
    IF iv_devclass(1) <> '$' AND p_trkor IS INITIAL.
      RETURN.
    ENDIF.

    CALL FUNCTION 'RS_CORR_INSERT'
      EXPORTING
        object              = iv_name
        object_class        = 'ABAP'
        mode                = 'I'
        global_lock         = 'X'
        devclass            = iv_devclass
        korrnum             = p_trkor
        master_language     = sy-langu
        suppress_dialog     = 'X'
      EXCEPTIONS
        cancelled           = 1
        permission_failure  = 2
        unknown_objectclass = 3
        OTHERS              = 4.
    IF sy-subrc = 0.
      rv_ok = 'X'.
    ENDIF.
  ENDMETHOD.

  METHOD import_all.
    DATA: lt_backups TYPE ty_backups,
          ls_backup  TYPE ty_backup,
          lv_actvt   TYPE c LENGTH 2,
          lv_text    TYPE string,
          lv_id      TYPE indx-srtfd,
          lt_locked  TYPE ty_names.
    FIELD-SYMBOLS: <ls_object> TYPE ty_object,
                   <lv_name>   TYPE progname.

    " pass 1: transport, authority, locks - nothing is written yet
    LOOP AT mt_objects ASSIGNING <ls_object>.
      IF <ls_object>-devclass(1) <> '$' AND p_trkor IS INITIAL.
        CONCATENATE <ls_object>-name 'is in transportable package'
                    <ls_object>-devclass '- fill P_TRKOR'
                    INTO lv_text SEPARATED BY space.
        error( lv_text ).
        CONTINUE.
      ENDIF.
      IF <ls_object>-exists = 'X'.
        lv_actvt = '02'.
      ELSE.
        lv_actvt = '01'.
      ENDIF.
      IF check_authority( iv_name     = <ls_object>-name
                          iv_devclass = <ls_object>-devclass
                          iv_actvt    = lv_actvt ) = space.
        CONCATENATE <ls_object>-name '- no S_DEVELOP authorization'
          INTO lv_text SEPARATED BY space.
        error( lv_text ).
        CONTINUE.
      ENDIF.
      IF lock( <ls_object>-name ) = space.
        CONCATENATE <ls_object>-name '- locked by another user/editor'
          INTO lv_text SEPARATED BY space.
        error( lv_text ).
        CONTINUE.
      ENDIF.
      APPEND <ls_object>-name TO lt_locked.
    ENDLOOP.

    " pass 2: backup of the current state for P_UNDO
    IF mv_errors = 0.
      LOOP AT mt_objects ASSIGNING <ls_object>.
        CLEAR ls_backup.
        ls_backup-name    = <ls_object>-name.
        ls_backup-existed = <ls_object>-exists.
        IF <ls_object>-exists = 'X'.
          READ REPORT <ls_object>-name INTO ls_backup-source.
          READ TEXTPOOL <ls_object>-name INTO ls_backup-texts
            LANGUAGE sy-langu.
        ENDIF.
        APPEND ls_backup TO lt_backups.
      ENDLOOP.
      lv_id = backup_id( ).
      EXPORT backups = lt_backups TO DATABASE indx(zc) ID lv_id.
      COMMIT WORK.
    ENDIF.

    " pass 3: write
    IF mv_errors = 0.
      LOOP AT mt_objects ASSIGNING <ls_object>.
        save_object( <ls_object> ).
      ENDLOOP.
      COMMIT WORK.
    ENDIF.

    LOOP AT lt_locked ASSIGNING <lv_name>.
      unlock( <lv_name> ).
    ENDLOOP.
  ENDMETHOD.

  METHOD save_object.
    DATA: lt_tp   TYPE ty_textpool,
          lv_text TYPE string,
          lv_lns  TYPE c LENGTH 10,
          lv_kind TYPE string.

    IF corr_insert( iv_name     = is_object-name
                    iv_devclass = is_object-devclass ) = space.
      CONCATENATE is_object-name
                  '- RS_CORR_INSERT failed (package/transport?)'
                  INTO lv_text SEPARATED BY space.
      error( lv_text ).
      RETURN.
    ENDIF.

    IF is_object-exists = 'X'.
      INSERT REPORT is_object-name FROM is_object-source
        KEEPING DIRECTORY ENTRY.
      lv_kind = 'updated'.
    ELSE.
      INSERT REPORT is_object-name FROM is_object-source
        PROGRAM TYPE is_object-subc
        FIXED-POINT ARITHMETIC 'X'
        UNICODE ENABLING 'X'.
      lv_kind = 'created'.
    ENDIF.
    IF sy-subrc <> 0.
      CONCATENATE is_object-name '- INSERT REPORT failed'
        INTO lv_text SEPARATED BY space.
      error( lv_text ).
      RETURN.
    ENDIF.

    lt_tp = merge_texts( is_object ).
    IF lt_tp IS NOT INITIAL.
      INSERT TEXTPOOL is_object-name FROM lt_tp LANGUAGE sy-langu.
    ENDIF.

    lv_lns = lines( is_object-source ).
    CONDENSE lv_lns.
    CONCATENATE 'OK' is_object-name lv_kind '(' INTO lv_text
      SEPARATED BY space.
    CONCATENATE lv_text lv_lns ' lines, package ' is_object-devclass
                ')' INTO lv_text.
    out( lv_text ).
  ENDMETHOD.

  METHOD merge_texts.
    DATA: ls_tp  TYPE textpool,
          lv_chg TYPE ty_flag.
    FIELD-SYMBOLS <ls_tp> TYPE textpool.

    READ TEXTPOOL is_object-name INTO rt_tp LANGUAGE sy-langu.

    LOOP AT is_object-texts INTO ls_tp.
      READ TABLE rt_tp ASSIGNING <ls_tp>
        WITH KEY id = ls_tp-id key = ls_tp-key.
      IF sy-subrc = 0.
        IF <ls_tp>-length > ls_tp-length.
          ls_tp-length = <ls_tp>-length.
        ENDIF.
        <ls_tp> = ls_tp.
      ELSE.
        APPEND ls_tp TO rt_tp.
      ENDIF.
      lv_chg = 'X'.
    ENDLOOP.

    " program title
    IF is_object-title IS NOT INITIAL
        OR ( is_object-exists IS INITIAL AND is_object-subc <> 'I' ).
      CLEAR ls_tp.
      ls_tp-id = 'R'.
      IF is_object-title IS NOT INITIAL.
        ls_tp-entry = is_object-title.
      ELSE.
        ls_tp-entry = is_object-name.
      ENDIF.
      ls_tp-length = strlen( ls_tp-entry ).
      READ TABLE rt_tp ASSIGNING <ls_tp> WITH KEY id = 'R'.
      IF sy-subrc = 0.
        <ls_tp> = ls_tp.
      ELSE.
        APPEND ls_tp TO rt_tp.
      ENDIF.
      lv_chg = 'X'.
    ENDIF.

    IF lv_chg IS INITIAL.
      CLEAR rt_tp.
    ENDIF.
  ENDMETHOD.

  METHOD syntax_check_all.
    DATA: lt_mains  TYPE ty_names,
          lv_main   TYPE progname,
          lt_source TYPE ty_source,
          ls_object TYPE ty_object,
          lv_text   TYPE string.
    FIELD-SYMBOLS <ls_object> TYPE ty_object.

    LOOP AT mt_objects ASSIGNING <ls_object>.
      IF <ls_object>-subc = 'I'.
        IF <ls_object>-main IS NOT INITIAL.
          APPEND <ls_object>-main TO lt_mains.
        ELSE.
          CONCATENATE 'NOTE' <ls_object>-name
                      'is an include without MAIN= - not checked'
                      INTO lv_text SEPARATED BY space.
          out( lv_text ).
        ENDIF.
      ELSE.
        APPEND <ls_object>-name TO lt_mains.
      ENDIF.
    ENDLOOP.

    SORT lt_mains.
    DELETE ADJACENT DUPLICATES FROM lt_mains.

    IF p_chk = 'X'.
      out( 'NOTE check-only: includes are read from the system,' ).
      out( 'NOTE not from the bundle' ).
    ENDIF.

    LOOP AT lt_mains INTO lv_main.
      CLEAR lt_source.
      READ TABLE mt_objects INTO ls_object WITH KEY name = lv_main.
      IF sy-subrc = 0 AND p_chk = 'X'.
        lt_source = ls_object-source.
      ELSE.
        READ REPORT lv_main INTO lt_source.
        IF sy-subrc <> 0.
          CONCATENATE 'NOTE main program' lv_main
                      'not found - not checked'
                      INTO lv_text SEPARATED BY space.
          out( lv_text ).
          CONTINUE.
        ENDIF.
      ENDIF.
      syntax_check( iv_program = lv_main
                    it_source  = lt_source ).
    ENDLOOP.
  ENDMETHOD.

  METHOD syntax_check.
    DATA: lv_msg     TYPE string,
          lv_line    TYPE i,
          lv_word    TYPE string,
          lv_incl    TYPE progname,
          lv_text    TYPE string,
          lv_num     TYPE c LENGTH 10,
          lt_inc_src TYPE ty_source,
          lv_src     TYPE ty_src_line,
          ls_object  TYPE ty_object.

    SYNTAX-CHECK FOR it_source
      MESSAGE lv_msg
      LINE    lv_line
      WORD    lv_word
      PROGRAM iv_program
      INCLUDE lv_incl.

    IF sy-subrc = 0.
      CONCATENATE 'SYNTAX' iv_program 'OK' INTO lv_text
        SEPARATED BY space.
      out( lv_text ).
      RETURN.
    ENDIF.

    mv_errors = mv_errors + 1.
    IF lv_incl IS INITIAL.
      lv_incl = iv_program.
    ENDIF.
    lv_num = lv_line.
    CONDENSE lv_num.
    CONCATENATE 'SYNTAX' iv_program 'ERROR include' lv_incl
                'line' lv_num INTO lv_text SEPARATED BY space.
    IF lv_word IS NOT INITIAL.
      CONCATENATE lv_text ' word "' lv_word '"' INTO lv_text.
    ENDIF.
    out( lv_text ).
    CONCATENATE '  MSG' lv_msg INTO lv_text SEPARATED BY space.
    out( lv_text ).

    " show the offending source line
    IF lv_incl = iv_program.
      lt_inc_src = it_source.
    ELSE.
      READ TABLE mt_objects INTO ls_object WITH KEY name = lv_incl.
      IF sy-subrc = 0 AND p_chk IS INITIAL.
        lt_inc_src = ls_object-source.
      ELSE.
        READ REPORT lv_incl INTO lt_inc_src.
      ENDIF.
    ENDIF.
    READ TABLE lt_inc_src INTO lv_src INDEX lv_line.
    IF sy-subrc = 0.
      CONCATENATE '  SRC' lv_src INTO lv_text SEPARATED BY space.
      out( lv_text ).
    ENDIF.
  ENDMETHOD.

  METHOD undo_last.
    DATA: lt_backups TYPE ty_backups,
          ls_backup  TYPE ty_backup,
          lv_id      TYPE indx-srtfd,
          lv_devc    TYPE devclass,
          lv_text    TYPE string.

    lv_id = backup_id( ).
    IMPORT backups = lt_backups FROM DATABASE indx(zc) ID lv_id.
    IF sy-subrc <> 0.
      error( 'no backup of a previous import found' ).
      RETURN.
    ENDIF.

    LOOP AT lt_backups INTO ls_backup.
      IF ls_backup-existed IS INITIAL.
        CONCATENATE 'NOTE' ls_backup-name
                    'was created by the import - delete it in SE38'
                    'if no longer needed'
                    INTO lv_text SEPARATED BY space.
        out( lv_text ).
        CONTINUE.
      ENDIF.

      SELECT SINGLE devclass FROM tadir INTO lv_devc
        WHERE pgmid    = 'R3TR'
          AND object   = 'PROG'
          AND obj_name = ls_backup-name.

      IF check_authority( iv_name     = ls_backup-name
                          iv_devclass = lv_devc
                          iv_actvt    = '02' ) = space.
        CONCATENATE ls_backup-name '- no S_DEVELOP authorization'
          INTO lv_text SEPARATED BY space.
        error( lv_text ).
        CONTINUE.
      ENDIF.
      IF lock( ls_backup-name ) = space.
        CONCATENATE ls_backup-name '- locked by another user/editor'
          INTO lv_text SEPARATED BY space.
        error( lv_text ).
        CONTINUE.
      ENDIF.
      IF corr_insert( iv_name     = ls_backup-name
                      iv_devclass = lv_devc ) = space
          AND lv_devc(1) <> '$'.
        CONCATENATE ls_backup-name
                    '- RS_CORR_INSERT failed (fill P_TRKOR?)'
                    INTO lv_text SEPARATED BY space.
        error( lv_text ).
        unlock( ls_backup-name ).
        CONTINUE.
      ENDIF.

      INSERT REPORT ls_backup-name FROM ls_backup-source
        KEEPING DIRECTORY ENTRY.
      IF ls_backup-texts IS NOT INITIAL.
        INSERT TEXTPOOL ls_backup-name FROM ls_backup-texts
          LANGUAGE sy-langu.
      ENDIF.
      unlock( ls_backup-name ).

      CONCATENATE 'OK' ls_backup-name 'restored'
        INTO lv_text SEPARATED BY space.
      out( lv_text ).
    ENDLOOP.

    IF mv_errors = 0.
      DELETE FROM DATABASE indx(zc) ID lv_id.
    ENDIF.
    COMMIT WORK.
  ENDMETHOD.

  METHOD backup_id.
    CONCATENATE 'ZCLAUDE_' sy-uname INTO rv_id.
  ENDMETHOD.

  METHOD finish.
    DATA: lv_text TYPE string,
          lv_num  TYPE c LENGTH 10,
          lv_rc   TYPE i,
          lv_line TYPE ty_clip_line.

    lv_num = mv_errors.
    CONDENSE lv_num.
    CONCATENATE '*@@SUMMARY errors=' lv_num INTO lv_text.
    out( lv_text ).
    out( '*@@END' ).

    CALL METHOD cl_gui_frontend_services=>clipboard_export
      IMPORTING
        data                 = mt_result
      CHANGING
        rc                   = lv_rc
      EXCEPTIONS
        cntl_error           = 1
        error_no_gui         = 2
        not_supported_by_gui = 3
        OTHERS               = 4.
    IF sy-subrc = 0.
      cl_gui_cfw=>flush( ).
      WRITE / '>>> Result copied to clipboard - paste it to Claude <<<'.
    ELSE.
      WRITE / '>>> Clipboard export failed - copy the list below <<<'.
    ENDIF.
    ULINE.

    LOOP AT mt_result INTO lv_line.
      lv_text = lv_line.
      WRITE / lv_text.
    ENDLOOP.
  ENDMETHOD.

ENDCLASS.

*----------------------------------------------------------------------*
START-OF-SELECTION.
  DATA go_bridge TYPE REF TO lcl_bridge.
  CREATE OBJECT go_bridge.
  go_bridge->run( ).
