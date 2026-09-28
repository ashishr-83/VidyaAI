"""
Extract text per page from all 32 NCERT chapter PDFs and write to
backend/scripts/pdf_text_cache/<subject>/<filename>.json

Run from the backend/ directory:
  python scripts/extractPdfText.py
"""

import os, json, sys
from pathlib import Path
from typing import List
from PyPDF2 import PdfReader

BASE_DIR   = Path(__file__).resolve().parent.parent.parent   # project root
NCERT_ROOT = BASE_DIR / "NCERT" / "Class_7"
OUT_DIR    = Path(__file__).resolve().parent / "pdf_text_cache"

SUBJECTS = [
    ("Mathematics",    "Mathematics"),
    ("Science",        "Science"),
    ("Social Science", "SocialScience"),
]

SKIP_PREFIX = ("ch_00_", "glossary_")

def extract_pages(pdf_path: Path) -> List[str]:
    reader = PdfReader(str(pdf_path))
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages.append(text)
    return pages

def main():
    total = 0
    for folder_name, s3_prefix in SUBJECTS:
        src_dir = NCERT_ROOT / folder_name
        out_dir = OUT_DIR / s3_prefix
        out_dir.mkdir(parents=True, exist_ok=True)

        pdfs = sorted(p for p in src_dir.glob("*.pdf")
                      if not any(p.name.startswith(x) for x in SKIP_PREFIX))

        print(f"\n-- {folder_name} ({len(pdfs)} chapters) --")

        for pdf_path in pdfs:
            out_path = out_dir / (pdf_path.stem + ".json")
            try:
                pages = extract_pages(pdf_path)
                out_path.write_text(json.dumps({"pages": pages}, ensure_ascii=False), encoding="utf-8")
                print(f"  OK  {pdf_path.name}  ({len(pages)} pages)")
                total += 1
            except Exception as e:
                print(f"  ✗  {pdf_path.name}: {e}", file=sys.stderr)

    print(f"\nDone. {total} PDFs extracted to {OUT_DIR}")

if __name__ == "__main__":
    main()
