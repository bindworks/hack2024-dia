#!/bin/bash


(while read STATUS FN JSON; do
  if [ "$STATUS" == "SUCCESS" ]; then
    rm -rf LATEXTMP
    mkdir LATEXTMP

    echo "$JSON" | node src/genlatex > LATEXTMP/latex.tex
    (
      cd LATEXTMP
      pdflatex latex.tex
    )
    mkdir -p "REPORT/$(dirname "$FN")"
    pdfunite LATEXTMP/latex.pdf "$FN" "REPORT/$FN"
  fi
done) < PARSEALL
