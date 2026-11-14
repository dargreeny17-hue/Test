#!/bin/bash
set -e
SP=/tmp/claude-0/-home-user-Test/86e62f66-370d-54a3-b0e8-7d8f19fd19dc/scratchpad
D=$SP/deck-l2
python3 $SP/work-l2/build.py $D
python3 $SP/work-l2/sync_notes.py /home/user/Test/ai-course/lesson-2/script.md $D
S=$D/project/slides
T="python3 $SP/tools/decor.py --lesson=l2 $S"
$T cover cover
$T cover-next next
$T content roster agenda hw-numbers hw-works hw-errors kp-traps file-types lost long-doc rule-1 rule-3 traffic-docs formula-doc excel-kp ai-excel roles homework
$T content-plain contract-result rule-2 summary
$T dark demo-contract demo-kp
$T sec s-hw s-files s-rules s-formula s-numbers
$T act poll-files break turn-doc check-three
