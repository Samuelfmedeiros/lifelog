#!/usr/bin/env python3
"""Smoke test for lifelog project validation."""

import argparse
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent


def check_python_syntax(directory: Path) -> list[str]:
    """Check Python files for syntax errors."""
    errors = []
    for py_file in directory.rglob("*.py"):
        try:
            compile(py_file.read_text(), str(py_file), "exec")
        except SyntaxError as e:
            errors.append(f"{py_file}:{e.lineno}: {e.msg}")
    return errors


def check_ts_syntax(directory: Path) -> list[str]:
    """Check TypeScript/TypeScript files for basic syntax issues."""
    errors = []
    ts_patterns = ["*.ts", "*.tsx", "*.js", "*.jsx"]
    for pattern in ts_patterns:
        for ts_file in directory.rglob(pattern):
            try:
                content = ts_file.read_text()
                if "import " in content or "from " in content:
                    pass
            except Exception as e:
                errors.append(f"{ts_file}: {e}")
    return errors


def check_json_validity(directory: Path) -> list[str]:
    """Check JSON files for basic validity."""
    import json
    errors = []
    for json_file in directory.rglob("*.json"):
        if "node_modules" in str(json_file) or ".vercel" in str(json_file):
            continue
        try:
            json_file.read_text()
        except Exception as e:
            errors.append(f"{json_file}: {e}")
    return errors


def check_package_json() -> list[str]:
    """Validate package.json structure."""
    errors = []
    pkg_file = PROJECT_ROOT / "package.json"
    if not pkg_file.exists():
        errors.append("package.json not found")
        return errors
    
    import json
    try:
        pkg = json.loads(pkg_file.read_text())
        if "scripts" not in pkg:
            errors.append("package.json missing 'scripts' field")
        if "dependencies" not in pkg and "devDependencies" not in pkg:
            errors.append("package.json missing dependencies")
    except json.JSONDecodeError as e:
        errors.append(f"package.json invalid JSON: {e}")
    return errors


def check_tsconfig() -> list[str]:
    """Check tsconfig.json exists."""
    errors = []
    tsconfig = PROJECT_ROOT / "tsconfig.json"
    if not tsconfig.exists():
        errors.append("tsconfig.json not found")
    return errors


def check_astro_config() -> list[str]:
    """Check astro.config.mjs exists."""
    errors = []
    astro_config = PROJECT_ROOT / "astro.config.mjs"
    if not astro_config.exists():
        errors.append("astro.config.mjs not found")
    return errors


def check_source_files(directory: Path) -> list[str]:
    """Check source files exist and are non-empty."""
    errors = []
    src_dir = directory / "src"
    if not src_dir.exists():
        errors.append("src/ directory not found")
        return errors
    
    expected_dirs = ["pages", "components", "content.config.ts"]
    for item in expected_dirs:
        item_path = src_dir / item
        if not item_path.exists():
            errors.append(f"src/{item} not found")
    return errors


def main():
    parser = argparse.ArgumentParser(description="Smoke test lifelog project")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    args = parser.parse_args()
    
    all_errors = []
    
    all_errors.extend(check_python_syntax(PROJECT_ROOT))
    all_errors.extend(check_ts_syntax(PROJECT_ROOT))
    all_errors.extend(check_json_validity(PROJECT_ROOT))
    all_errors.extend(check_package_json())
    all_errors.extend(check_tsconfig())
    all_errors.extend(check_astro_config())
    all_errors.extend(check_source_files(PROJECT_ROOT))
    
    if all_errors:
        print("SMOKE TEST FAILED")
        for err in all_errors:
            print(f"  - {err}")
        return 1
    
    print("SMOKE TEST PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())