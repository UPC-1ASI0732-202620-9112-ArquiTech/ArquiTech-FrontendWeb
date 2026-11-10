import json
import re
from pathlib import Path
from pypdf import PdfReader

root = Path(__file__).resolve().parent
results = []
for folder in sorted(root.glob("EC06-*-B")):
    for path in sorted(folder.glob("*.pdf")):
        reader = PdfReader(path)
        text = "\n".join(page.extract_text() for page in reader.pages)
        evidence = json.loads((folder / "verification-input.json").read_text(encoding="utf-8"))
        result_file = folder / "result-verified.json"
        if not result_file.exists():
            result_file = folder / "result.json"
        result = json.loads(result_file.read_text(encoding="utf-8"))
        reference = result["verified_cases"][0]["expected"]
        patterns = {
            "project": re.escape(reference["project"]),
            "progress": rf'Avance\s*\(%\)\s*{reference["progress"]}%',
            "openTasks": rf'Tareas pendientes\s*{reference["openTasks"]}\b',
            "openIncidents": rf'Incidencias sin resolver\s*{reference["openIncidents"]}\b',
            "completed": rf'Tareas completadas\s*\({reference["completed"]}\)',
            "entries": rf'Entradas de materiales\s*\({reference["entries"]}\)',
            "usages": rf'Salidas de materiales\s*\({reference["usages"]}\)',
            "incidents": rf'Incidencias registradas\s*\({reference["incidents"]}\)',
        }
        checks = {name: bool(re.search(pattern, text, re.I)) for name, pattern in patterns.items()}
        checks["file_period"] = reference["weekStart"] in path.name
        checks["status"] = bool(re.search(r'Estado\s+Activo', text, re.I))
        (folder / "pdf-extracted.txt").write_text(text, encoding="utf-8")
        results.append({"id": evidence["id"], "pdf": path.relative_to(root).as_posix(),
                        "pages": len(reader.pages), "checked": checks, "passed": all(checks.values())})
(root / "pdf-audit.json").write_text(json.dumps(results, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
print(f"PDF verified: {sum(item['passed'] for item in results)}/{len(results)}")
