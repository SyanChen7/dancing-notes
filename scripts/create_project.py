"""Copy Dancing Notes into a NEW standalone project without installing dependencies."""
import argparse
from pathlib import Path
import shutil


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    dest = parser.parse_args().destination.expanduser().resolve()
    if dest.exists():
        parser.error("Destination already exists. Choose a new directory; existing projects require manual integration.")
    for parent in dest.parents:
        if (parent / "package.json").exists():
            parser.error("Destination is inside an existing Node project. Merge the template into that project instead.")
    skill = Path(__file__).resolve().parents[1]
    if dest == skill or skill in dest.parents:
        parser.error("Create your working project outside the installed skill.")
    source = skill / "assets" / "dancing-notes-starter"
    if not (source / "package.json.template").is_file():
        parser.error("Bundled starter is missing package.json.template; reinstall the complete skill.")
    entries = list(source.rglob("*"))
    if any(f.is_symlink() for f in entries):
        parser.error("Starter must contain regular files, not symlinks.")
    dest.mkdir(parents=True, exist_ok=False)
    for file in entries:
        if not file.is_file():
            continue
        relative = file.relative_to(source)
        if relative == Path("package.json.template"):
            relative = Path("package.json")
        target = dest / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(file, target)
    print(f"Created {dest}. Read README.md, then install dependencies in that project.")


if __name__ == "__main__":
    main()
