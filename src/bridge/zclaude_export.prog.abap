*&---------------------------------------------------------------------*
*& Report ZCLAUDE_EXPORT
*&---------------------------------------------------------------------*
*& Clipboard bridge, export side (read only).
*&
*& Collects sources and DDIC definitions of the selected objects into
*& one text and puts it into the clipboard, so it can be pasted to the
*& developer in a single step.
*&
*&   S_PROG  programs / includes (P_INCL: plus their Z/Y includes)
*&   S_CLAS  global classes and interfaces (all sections + methods)
*&   S_FUNC  function modules
*&   S_TABL  tables / structures / views (field list)
*&   P_DEVC  everything of a package (PROG, CLAS, INTF, FUGR, TABL)
*&
*& Programs are exported in the same format ZCLAUDE_IMPORT reads,
*& so an exported program can be changed and imported back.
*& Nothing is changed in the system. S_DEVELOP display is checked.
*& Written in classic syntax on purpose (runs on old releases too).
*&---------------------------------------------------------------------*
REPORT zclaude_export LINE-SIZE 255.

TYPES: ty_flag            TYPE c LENGTH 1,
       ty_clip_line(1000) TYPE c,
       ty_clip            TYPE STANDARD TABLE OF ty_clip_line
                               WITH DEFAULT KEY,
       ty_src_line(255)   TYPE c,
       ty_source          TYPE STANDARD TABLE OF ty_src_line
                               WITH DEFAULT KEY,
       ty_names           TYPE STANDARD TABLE OF progname
                               WITH DEFAULT KEY.

DATA: gv_prog TYPE progname,
      gv_clas TYPE seoclsname,
      gv_func TYPE rs38l_fnam,
      gv_tabl TYPE tabname.

SELECTION-SCREEN BEGIN OF BLOCK obj WITH FRAME.
SELECT-OPTIONS: s_prog FOR gv_prog NO INTERVALS,
                s_clas FOR gv_clas NO INTERVALS,
                s_func FOR gv_func NO INTERVALS,
                s_tabl FOR gv_tabl NO INTERVALS.
PARAMETERS:     p_devc TYPE devclass.
SELECTION-SCREEN END OF BLOCK obj.

SELECTION-SCREEN BEGIN OF BLOCK opt WITH FRAME.
PARAMETERS: p_incl AS CHECKBOX DEFAULT 'X',
            p_text AS CHECKBOX DEFAULT 'X'.
SELECTION-SCREEN END OF BLOCK opt.

*----------------------------------------------------------------------*
CLASS lcl_export DEFINITION FINAL.
  PUBLIC SECTION.
    METHODS run.

  PRIVATE SECTION.
    DATA: mt_out  TYPE ty_clip,
          mt_done TYPE ty_names,
          mv_objs TYPE i.

    METHODS out
      IMPORTING iv_text TYPE csequence.
    METHODS out_source
      IMPORTING it_source TYPE ty_source.
    METHODS add_header.
    METHODS is_customer
      IMPORTING iv_name      TYPE progname
      RETURNING value(rv_ok) TYPE ty_flag.
    METHODS authorized
      IMPORTING iv_objtype   TYPE c
                iv_name      TYPE csequence
      RETURNING value(rv_ok) TYPE ty_flag.
    METHODS already_done
      IMPORTING iv_name        TYPE csequence
      RETURNING value(rv_done) TYPE ty_flag.
    METHODS collect_package.
    METHODS export_program
      IMPORTING iv_name TYPE progname
                iv_main TYPE progname OPTIONAL.
    METHODS export_class
      IMPORTING iv_name TYPE seoclsname.
    METHODS export_class_include
      IMPORTING iv_clsname TYPE seoclsname
                iv_include TYPE progname
                iv_part    TYPE csequence.
    METHODS export_function
      IMPORTING iv_name TYPE rs38l_fnam.
    METHODS export_table
      IMPORTING iv_name TYPE tabname.
    METHODS finish.
ENDCLASS.

*----------------------------------------------------------------------*
CLASS lcl_export IMPLEMENTATION.

  METHOD run.
    DATA: lt_progs TYPE ty_names,
          lv_prog  TYPE progname,
          lt_clas  TYPE STANDARD TABLE OF seoclsname WITH DEFAULT KEY,
          lv_clas  TYPE seoclsname,
          lt_func  TYPE STANDARD TABLE OF rs38l_fnam WITH DEFAULT KEY,
          lv_func  TYPE rs38l_fnam,
          lt_tabl  TYPE STANDARD TABLE OF tabname WITH DEFAULT KEY,
          lv_tabl  TYPE tabname.

    add_header( ).

    IF p_devc IS NOT INITIAL.
      collect_package( ).
    ENDIF.

    IF s_prog[] IS NOT INITIAL.
      SELECT name FROM trdir INTO TABLE lt_progs
        WHERE name IN s_prog.
      LOOP AT lt_progs INTO lv_prog.
        export_program( lv_prog ).
      ENDLOOP.
    ENDIF.

    IF s_clas[] IS NOT INITIAL.
      SELECT clsname FROM seoclass INTO TABLE lt_clas
        WHERE clsname IN s_clas.
      LOOP AT lt_clas INTO lv_clas.
        export_class( lv_clas ).
      ENDLOOP.
    ENDIF.

    IF s_func[] IS NOT INITIAL.
      SELECT funcname FROM tfdir INTO TABLE lt_func
        WHERE funcname IN s_func.
      LOOP AT lt_func INTO lv_func.
        export_function( lv_func ).
      ENDLOOP.
    ENDIF.

    IF s_tabl[] IS NOT INITIAL.
      SELECT tabname FROM dd02l INTO TABLE lt_tabl
        WHERE tabname  IN s_tabl
          AND as4local = 'A'.
      LOOP AT lt_tabl INTO lv_tabl.
        export_table( lv_tabl ).
      ENDLOOP.
    ENDIF.

    finish( ).
  ENDMETHOD.

  METHOD out.
    DATA lv_line TYPE ty_clip_line.
    lv_line = iv_text.
    APPEND lv_line TO mt_out.
  ENDMETHOD.

  METHOD out_source.
    DATA lv_line TYPE ty_clip_line.
    FIELD-SYMBOLS <lv_src> TYPE ty_src_line.
    LOOP AT it_source ASSIGNING <lv_src>.
      " a source line starting with *@@ would break the bundle format
      IF <lv_src>(3) = '*@@'.
        CONCATENATE '* @@' <lv_src>+3 INTO lv_line.
      ELSE.
        lv_line = <lv_src>.
      ENDIF.
      APPEND lv_line TO mt_out.
    ENDLOOP.
  ENDMETHOD.

  METHOD add_header.
    DATA: lv_rel  TYPE cvers-release,
          lv_sp   TYPE cvers-extrelease,
          lv_line TYPE string.

    SELECT SINGLE release extrelease FROM cvers
      INTO (lv_rel, lv_sp)
      WHERE component = 'SAP_BASIS'.

    CONCATENATE '*@@BUNDLE v1 export system=' sy-sysid
                ' client=' sy-mandt ' basis=' lv_rel ' sp=' lv_sp
                ' lang=' sy-langu ' date=' sy-datum
                INTO lv_line.
    out( lv_line ).
  ENDMETHOD.

  METHOD is_customer.
    IF iv_name(1) = 'Z' OR iv_name(1) = 'Y'
        OR iv_name(2) = 'LZ' OR iv_name(2) = 'LY'
        OR iv_name(5) = 'SAPLZ' OR iv_name(5) = 'SAPLY'.
      rv_ok = 'X'.
    ENDIF.
  ENDMETHOD.

  METHOD authorized.
    DATA: lv_actvt   TYPE c LENGTH 2 VALUE '03',
          lv_objtype TYPE c LENGTH 4,
          lv_objname TYPE c LENGTH 40,
          lv_msg     TYPE string.

    lv_objtype = iv_objtype.
    lv_objname = iv_name.
    AUTHORITY-CHECK OBJECT 'S_DEVELOP'
      ID 'DEVCLASS' DUMMY
      ID 'OBJTYPE'  FIELD lv_objtype
      ID 'OBJNAME'  FIELD lv_objname
      ID 'P_GROUP'  DUMMY
      ID 'ACTVT'    FIELD lv_actvt.
    IF sy-subrc = 0.
      rv_ok = 'X'.
    ELSE.
      CONCATENATE '*@@SKIP' iv_objtype iv_name 'no display authorization'
        INTO lv_msg SEPARATED BY space.
      out( lv_msg ).
    ENDIF.
  ENDMETHOD.

  METHOD already_done.
    DATA lv_name TYPE progname.
    lv_name = iv_name.
    READ TABLE mt_done TRANSPORTING NO FIELDS WITH KEY table_line = lv_name.
    IF sy-subrc = 0.
      rv_done = 'X'.
    ELSE.
      APPEND lv_name TO mt_done.
    ENDIF.
  ENDMETHOD.

  METHOD collect_package.
    TYPES: BEGIN OF ty_tadir,
             object   TYPE tadir-object,
             obj_name TYPE tadir-obj_name,
           END OF ty_tadir.
    DATA: lt_tadir TYPE STANDARD TABLE OF ty_tadir WITH DEFAULT KEY,
          ls_tadir TYPE ty_tadir,
          lv_prog  TYPE progname,
          lv_clas  TYPE seoclsname,
          lv_tabl  TYPE tabname.

    SELECT object obj_name FROM tadir INTO TABLE lt_tadir
      WHERE pgmid    = 'R3TR'
        AND devclass = p_devc
        AND ( object = 'PROG' OR object = 'CLAS' OR object = 'INTF'
           OR object = 'FUGR' OR object = 'TABL' ).
    SORT lt_tadir BY object obj_name.

    LOOP AT lt_tadir INTO ls_tadir.
      CASE ls_tadir-object.
        WHEN 'PROG'.
          lv_prog = ls_tadir-obj_name.
          export_program( lv_prog ).
        WHEN 'CLAS' OR 'INTF'.
          lv_clas = ls_tadir-obj_name.
          export_class( lv_clas ).
        WHEN 'FUGR'.
          CONCATENATE 'SAPL' ls_tadir-obj_name INTO lv_prog.
          export_program( lv_prog ).
        WHEN 'TABL'.
          lv_tabl = ls_tadir-obj_name.
          export_table( lv_tabl ).
      ENDCASE.
    ENDLOOP.
  ENDMETHOD.

  METHOD export_program.
    DATA: lv_subc   TYPE trdir-subc,
          lt_source TYPE ty_source,
          lt_tp     TYPE STANDARD TABLE OF textpool WITH DEFAULT KEY,
          ls_tp     TYPE textpool,
          lv_title  TYPE string,
          lv_line   TYPE string,
          lt_incl   TYPE ty_names,
          lv_incl   TYPE progname.

    IF already_done( iv_name ) = 'X'.
      RETURN.
    ENDIF.
    IF authorized( iv_objtype = 'PROG' iv_name = iv_name ) = space.
      RETURN.
    ENDIF.

    SELECT SINGLE subc FROM trdir INTO lv_subc WHERE name = iv_name.
    IF sy-subrc <> 0.
      CONCATENATE '*@@SKIP PROG' iv_name 'not found'
        INTO lv_line SEPARATED BY space.
      out( lv_line ).
      RETURN.
    ENDIF.

    READ REPORT iv_name INTO lt_source.
    READ TEXTPOOL iv_name INTO lt_tp LANGUAGE sy-langu.
    READ TABLE lt_tp INTO ls_tp WITH KEY id = 'R'.
    IF sy-subrc = 0.
      lv_title = ls_tp-entry.
    ENDIF.

    CONCATENATE '*@@OBJECT PROG' iv_name INTO lv_line SEPARATED BY space.
    CONCATENATE lv_line ' TYPE=' lv_subc INTO lv_line.
    IF iv_main IS NOT INITIAL.
      CONCATENATE lv_line ' MAIN=' iv_main INTO lv_line.
    ENDIF.
    IF lv_title IS NOT INITIAL.
      CONCATENATE lv_line ' TITLE=' lv_title INTO lv_line.
    ENDIF.
    out( lv_line ).
    out_source( lt_source ).
    mv_objs = mv_objs + 1.

    IF p_text = 'X'.
      DELETE lt_tp WHERE id <> 'I' AND id <> 'S'.
      IF lt_tp IS NOT INITIAL.
        out( '*@@TEXTS' ).
        SORT lt_tp BY id key.
        LOOP AT lt_tp INTO ls_tp.
          IF ls_tp-id = 'S'.
            lv_title = ls_tp-entry+8.
          ELSE.
            lv_title = ls_tp-entry.
          ENDIF.
          CONCATENATE ls_tp-id ls_tp-key lv_title INTO lv_line
            SEPARATED BY space.
          out( lv_line ).
        ENDLOOP.
      ENDIF.
    ENDIF.

    " customer includes of this program (D010INC is filled on generation)
    IF p_incl = 'X' AND lv_subc <> 'I'.
      SELECT include FROM d010inc INTO TABLE lt_incl
        WHERE master = iv_name.
      SORT lt_incl.
      DELETE ADJACENT DUPLICATES FROM lt_incl.
      LOOP AT lt_incl INTO lv_incl.
        IF lv_incl <> iv_name AND is_customer( lv_incl ) = 'X'.
          export_program( iv_name = lv_incl
                          iv_main = iv_name ).
        ENDIF.
      ENDLOOP.
    ENDIF.
  ENDMETHOD.

  METHOD export_class.
    " class pool includes: <name padded with '=' to 30> + suffix
    TYPES: BEGIN OF ty_part,
             suffix  TYPE c LENGTH 10,
             include TYPE progname,
           END OF ty_part.
    DATA: lv_base   TYPE c LENGTH 30,
          lv_like   TYPE string,
          lt_incl   TYPE ty_names,
          lv_incl   TYPE progname,
          lt_parts  TYPE STANDARD TABLE OF ty_part WITH DEFAULT KEY,
          ls_part   TYPE ty_part,
          lt_order  TYPE STANDARD TABLE OF string WITH DEFAULT KEY,
          lv_order  TYPE string,
          lv_sfx    TYPE string,
          lv_label  TYPE string,
          lv_line   TYPE string,
          lv_descr  TYPE seoclasstx-descript,
          lv_objtyp TYPE c LENGTH 4.

    IF already_done( iv_name ) = 'X'.
      RETURN.
    ENDIF.
    IF authorized( iv_objtype = 'CLAS' iv_name = iv_name ) = space.
      RETURN.
    ENDIF.

    lv_base = iv_name.
    TRANSLATE lv_base USING ' ='.
    CONCATENATE lv_base '%' INTO lv_like.
    SELECT name FROM trdir INTO TABLE lt_incl WHERE name LIKE lv_like.
    SORT lt_incl.

    " LIKE treats '_' as a wildcard - keep exact prefix matches only
    lv_objtyp = 'CLAS'.
    LOOP AT lt_incl INTO lv_incl.
      IF lv_incl(30) = lv_base.
        ls_part-include = lv_incl.
        ls_part-suffix  = lv_incl+30.
        APPEND ls_part TO lt_parts.
        IF ls_part-suffix = 'IU'.
          lv_objtyp = 'INTF'.
        ENDIF.
      ENDIF.
    ENDLOOP.

    IF lt_parts IS INITIAL.
      CONCATENATE '*@@SKIP CLAS' iv_name 'no source includes found'
        INTO lv_line SEPARATED BY space.
      out( lv_line ).
      RETURN.
    ENDIF.

    SELECT SINGLE descript FROM seoclasstx INTO lv_descr
      WHERE clsname = iv_name AND langu = sy-langu.

    CONCATENATE '*@@CLASS' lv_objtyp iv_name INTO lv_line
      SEPARATED BY space.
    IF lv_descr IS NOT INITIAL.
      CONCATENATE lv_line ' TITLE=' lv_descr INTO lv_line.
    ENDIF.
    out( lv_line ).
    mv_objs = mv_objs + 1.

    " fixed order: definition sections, local types, methods, tests
    APPEND 'IU:INTERFACE'              TO lt_order.
    APPEND 'CU:PUBLIC'                 TO lt_order.
    APPEND 'CO:PROTECTED'              TO lt_order.
    APPEND 'CI:PRIVATE'                TO lt_order.
    APPEND 'CCDEF:LOCAL_DEFINITIONS'   TO lt_order.
    APPEND 'CCIMP:LOCAL_IMPLEMENTATIONS' TO lt_order.
    APPEND 'CCMAC:MACROS'              TO lt_order.
    APPEND 'CM*:METHOD'                TO lt_order.
    APPEND 'CCAU:TEST_CLASSES'         TO lt_order.

    LOOP AT lt_order INTO lv_order.
      SPLIT lv_order AT ':' INTO lv_sfx lv_label.
      LOOP AT lt_parts INTO ls_part.
        IF ls_part-suffix CP lv_sfx.
          export_class_include( iv_clsname = iv_name
                                iv_include = ls_part-include
                                iv_part    = lv_label ).
        ENDIF.
      ENDLOOP.
    ENDLOOP.
  ENDMETHOD.

  METHOD export_class_include.
    DATA: lt_source TYPE ty_source,
          lv_line   TYPE string,
          lv_lines  TYPE i.

    READ REPORT iv_include INTO lt_source.
    IF sy-subrc <> 0.
      RETURN.
    ENDIF.
    " skip generated empty includes
    DELETE lt_source WHERE table_line IS INITIAL.
    lv_lines = lines( lt_source ).
    IF lv_lines = 0.
      RETURN.
    ENDIF.
    READ REPORT iv_include INTO lt_source.

    CONCATENATE '*@@PART' iv_clsname iv_part iv_include INTO lv_line
      SEPARATED BY space.
    out( lv_line ).
    out_source( lt_source ).
  ENDMETHOD.

  METHOD export_function.
    DATA: lv_pname  TYPE tfdir-pname,
          lv_incno  TYPE tfdir-include,
          lv_area   TYPE string,
          lv_incl   TYPE progname,
          lt_source TYPE ty_source,
          lv_line   TYPE string.

    IF already_done( iv_name ) = 'X'.
      RETURN.
    ENDIF.
    IF authorized( iv_objtype = 'FUNC' iv_name = iv_name ) = space.
      RETURN.
    ENDIF.

    SELECT SINGLE pname include FROM tfdir INTO (lv_pname, lv_incno)
      WHERE funcname = iv_name.
    IF sy-subrc <> 0 OR lv_pname(4) <> 'SAPL'.
      CONCATENATE '*@@SKIP FUNC' iv_name 'not found / unsupported group'
        INTO lv_line SEPARATED BY space.
      out( lv_line ).
      RETURN.
    ENDIF.

    lv_area = lv_pname+4.
    CONCATENATE 'L' lv_area 'U' lv_incno INTO lv_incl.
    READ REPORT lv_incl INTO lt_source.

    " the generated *" comment block lists the full parameter interface
    CONCATENATE '*@@FUNCTION' iv_name 'GROUP=' INTO lv_line
      SEPARATED BY space.
    CONCATENATE lv_line lv_area ' INCLUDE=' lv_incl INTO lv_line.
    out( lv_line ).
    out_source( lt_source ).
    mv_objs = mv_objs + 1.
  ENDMETHOD.

  METHOD export_table.
    DATA: lv_class TYPE dd02l-tabclass,
          lv_text  TYPE dd02t-ddtext,
          lt_dfies TYPE STANDARD TABLE OF dfies WITH DEFAULT KEY,
          ls_dfies TYPE dfies,
          lv_leng  TYPE c LENGTH 6,
          lv_dec   TYPE c LENGTH 6,
          lv_line  TYPE string.

    IF already_done( iv_name ) = 'X'.
      RETURN.
    ENDIF.
    IF authorized( iv_objtype = 'TABL' iv_name = iv_name ) = space.
      RETURN.
    ENDIF.

    SELECT SINGLE tabclass FROM dd02l INTO lv_class
      WHERE tabname = iv_name AND as4local = 'A'.
    SELECT SINGLE ddtext FROM dd02t INTO lv_text
      WHERE tabname = iv_name AND ddlanguage = sy-langu
        AND as4local = 'A'.

    CALL FUNCTION 'DDIF_FIELDINFO_GET'
      EXPORTING
        tabname        = iv_name
        langu          = sy-langu
      TABLES
        dfies_tab      = lt_dfies
      EXCEPTIONS
        not_found      = 1
        internal_error = 2
        OTHERS         = 3.
    IF sy-subrc <> 0.
      CONCATENATE '*@@SKIP TABL' iv_name 'no field info'
        INTO lv_line SEPARATED BY space.
      out( lv_line ).
      RETURN.
    ENDIF.

    CONCATENATE '*@@DDIC TABL' iv_name INTO lv_line SEPARATED BY space.
    CONCATENATE lv_line ' CLASS=' lv_class ' TITLE=' lv_text
      INTO lv_line.
    out( lv_line ).
    out( 'FIELD | KEY | DATA ELEMENT | TYPE | LEN | DEC | CHECKTABLE | TEXT' ).
    LOOP AT lt_dfies INTO ls_dfies.
      lv_leng = ls_dfies-leng.
      SHIFT lv_leng LEFT DELETING LEADING '0'.
      lv_dec = ls_dfies-decimals.
      SHIFT lv_dec LEFT DELETING LEADING '0'.
      CONCATENATE ls_dfies-fieldname ls_dfies-keyflag ls_dfies-rollname
                  ls_dfies-datatype lv_leng lv_dec ls_dfies-checktable
                  ls_dfies-fieldtext
                  INTO lv_line SEPARATED BY ' | '.
      out( lv_line ).
    ENDLOOP.
    mv_objs = mv_objs + 1.
  ENDMETHOD.

  METHOD finish.
    DATA: lv_rc   TYPE i,
          lv_subrc TYPE sy-subrc,
          lv_num  TYPE c LENGTH 10,
          lv_lns  TYPE c LENGTH 10,
          lv_text TYPE string,
          lv_line TYPE ty_clip_line.

    lv_num = mv_objs.
    CONDENSE lv_num.
    CONCATENATE '*@@SUMMARY objects=' lv_num INTO lv_text.
    out( lv_text ).
    out( '*@@END' ).

    CALL METHOD cl_gui_frontend_services=>clipboard_export
      IMPORTING
        data                 = mt_out
      CHANGING
        rc                   = lv_rc
      EXCEPTIONS
        cntl_error           = 1
        error_no_gui         = 2
        not_supported_by_gui = 3
        OTHERS               = 4.
    lv_subrc = sy-subrc.

    lv_lns = lines( mt_out ).
    CONDENSE lv_lns.
    IF lv_subrc = 0.
      cl_gui_cfw=>flush( ).
      WRITE: / '>>> Copied to clipboard:', lv_num, 'objects,',
               lv_lns, 'lines - paste it to Claude <<<'.
    ELSE.
      WRITE / '>>> Clipboard export failed - copy the list below <<<'.
    ENDIF.
    ULINE.

    LOOP AT mt_out INTO lv_line.
      lv_text = lv_line.
      WRITE / lv_text.
    ENDLOOP.
  ENDMETHOD.

ENDCLASS.

*----------------------------------------------------------------------*
START-OF-SELECTION.
  DATA go_export TYPE REF TO lcl_export.
  CREATE OBJECT go_export.
  go_export->run( ).
