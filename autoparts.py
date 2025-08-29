#!/usr/bin/env python3
r"""
AI-powered and compact output-focused version of autoparts.

NEW (v3)
- --ai-name: AI-suggests package name based on file content (OpenAI or Ollama).
* If not, falls back to intelligent local heuristic naming.
- --compact: Single option "no files" (0..3). Automatically sets thresholds.
- --min-module-lines and --target-modules: Merge modules if they are small,

merge the smallest ones until the target module count is reached.
- Name suggester: Keyword extraction from docstring/comments/class-function names.

NOTES
- OpenAI requires the OPENAI_API_KEY environment variable. Provide the model with --ai-model (e.g., gpt-4o-mini).
- Ollama assumes localhost:11434; --ai-model (e.g., mistral) give; can be customized with --ai-base-url.
- Dynamic import/exec restrictions, etc., are the same as the previous version.
"""

from __future__ import annotations

import argparse
import ast
import keyword
import os
import re
import sys
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional, Sequence
from urllib import request, error

# ---------- Data types ----------

@dataclass
class TopLevelItem:
    name: str                # definition name (or constant name)
    kind: str                # "class" | "func" | "assign"
    node: ast.AST            # AST node
    source: str              # original source segment
    deps: Set[str] = field(default_factory=set)   # dependencies on other top-level names

@dataclass
class Component:
    names: List[str]
    items: List[TopLevelItem]
    module_name: str

# ---------- IO ----------

def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def write_text(p: Path, text: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")

# ---------- Name/Module name ----------

_identifier_re = re.compile(r"[^0-9a-zA-Z_]+")


def to_snake(name: str) -> str:
    name = name.strip().replace("-", "_")
    name = re.sub("([a-z0-9])([A-Z])", r"\1_\2", name)
    name = _identifier_re.sub("_", name).lower().strip("_")
    if not name:
        name = "module"
    if name[0].isdigit():
        name = f"m_{name}"
    if keyword.iskeyword(name):
        name = f"mod_{name}"
    return name


def ensure_unique_module_name(base: str, used: Set[str]) -> str:
    """Ensure module names are unique within a package by suffixing integers."""
    if base not in used:
        used.add(base)
        return base
    i = 2
    while f"{base}_{i}" in used:
        i += 1
    name = f"{base}_{i}"
    used.add(name)
    return name


def module_name_for_component(names: List[str]) -> str:
    """Generate a compact module name from the component's contained top-level names."""
    parts = [to_snake(n) for n in names if n]
    base = parts[0] if parts else "module"
    for extra in parts[1:3]:
        if len(base) < 20:
            base = f"{base}_{extra}"
    if len(base) > 40:
        base = base[:40].rstrip("_")
    return base or "module"

# ---------- AI Name Suggester ----------

TR_STOP = {
    "ve","ile","da","de","bir","bu","şu","o","için","olan","gibi","çok","az","en",
    "birlikte","üzerine","üzerinden","olan","yap","yapma","olan","olarak","ama","fakat","ancak",
}
EN_STOP = {
    "the","a","an","of","and","for","to","in","on","by","with","is","are","from","that",
}

_WORD_RE = re.compile(r"[A-Za-z0-9_]{3,}")
_VALID_NAME_RE = re.compile(r"^[a-z0-9_]{3,30}$")


def _freq_keywords(text: str, extra: Sequence[str] = ()) -> List[str]:
    """Return the most frequent non-stopword tokens (boosting `extra`)."""
    counts: Dict[str, int] = {}
    for token in _WORD_RE.findall(text.lower()):
        if token in TR_STOP or token in EN_STOP:
            continue
        if token.isdigit():
            continue
        counts[token] = counts.get(token, 0) + 1
    for t in extra:
        t = t.lower()
        if t and t not in TR_STOP and t not in EN_STOP and not t.isdigit():
            counts[t] = counts.get(t, 0) + 3
    return [w for w, _ in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))]


def local_heuristic_name(input_path: Path, src: str, tree: ast.Module, items: List[TopLevelItem]) -> str:
    """Heuristically suggest a package name by extracting keywords from docstring and early comments."""
    doc = ast.get_docstring(tree) or ""
    top_names = [it.name for it in items]
    comments = []
    # Comments within the first ~80 lines
    for i, line in enumerate(src.splitlines()[:80]):
        s = line.strip()
        if s.startswith("#"):
            comments.append(s.lstrip("# "))
    bag = "\n".join([doc] + comments)
    kws = _freq_keywords(bag, extra=top_names)[:4]
    if not kws:
        return to_snake(input_path.stem)
    base = "_".join(kws[:3])
    return to_snake(base)


def ai_chat_openai(messages: List[Dict[str, str]], model: str, base_url: Optional[str] = None) -> Optional[str]:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return None
    url = (base_url or "https://api.openai.com/v1") + "/chat/completions"
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 30,
    }
    req = request.Request(url, method="POST")
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    try:
        resp = request.urlopen(req, data=json.dumps(payload).encode("utf-8"), timeout=20)
        data = json.loads(resp.read().decode("utf-8"))
        content = data["choices"][0]["message"]["content"].strip()
        return content
    except Exception:
        return None


def ai_chat_ollama(messages: List[Dict[str, str]], model: str, base_url: Optional[str] = None) -> Optional[str]:
    url = (base_url or "http://localhost:11434") + "/api/generate"
    prompt = "\n\n".join([m.get("content", "") for m in messages])
    payload = {"model": model, "prompt": prompt, "stream": False}
    req = request.Request(url, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        resp = request.urlopen(req, data=json.dumps(payload).encode("utf-8"), timeout=20)
        data = json.loads(resp.read().decode("utf-8"))
        content = data.get("response", "").strip()
        return content
    except Exception:
        return None


def ai_suggest_name(input_path: Path, src: str, tree: ast.Module, items: List[TopLevelItem], *,
                    provider: Optional[str], model: Optional[str], base_url: Optional[str]) -> Optional[str]:
    """
    Ask an AI provider (OpenAI or Ollama) for a concise snake_case package name.
    Returns `None` on failure or if constraints are not met.
    """
    if not provider or not model:
        return None
    doc = ast.get_docstring(tree) or ""
    top_names = ", ".join(it.name for it in items[:30])
    brief = (doc or "")[:500]
    sys_prompt = (
        "You are a naming assistant. Propose one concise Python package name in snake_case, 3-5 words, "
        "<=30 characters, using only [a-z0-9_]. It should summarize the file's purpose based on docstring "
        "and top-level names. Return ONLY the name."
    )
    user_prompt = f"Docstring: {brief}\nTop-level names: {top_names}\nCurrent file: {input_path.name}"
    msgs = [{"role": "system", "content": sys_prompt}, {"role": "user", "content": user_prompt}]
    raw = None
    if provider == "openai":
        raw = ai_chat_openai(msgs, model=model, base_url=base_url)
    elif provider == "ollama":
        raw = ai_chat_ollama(msgs, model=model, base_url=base_url)
    if not raw:
        return None
    cand = to_snake(raw.split()[0])
    if _VALID_NAME_RE.match(cand):
        return cand
    return None

# ---------- AST Analysis ----------

class DependencyVisitor(ast.NodeVisitor):
    """Find usage of top-level names within a node (Load/Name) + annotations/decorators/bases.

    This walks through functions and classes to collect references to *other* top-level symbols
    in the same file. Those references are later used to group strongly related definitions
    into the same module.
    """

    def __init__(self, top_level_names: Set[str]):
        self.top_level_names = top_level_names
        self.used: Set[str] = set()

    def visit_Name(self, node: ast.Name):
        if isinstance(node.ctx, ast.Load) and node.id in self.top_level_names:
            self.used.add(node.id)

    def visit_Attribute(self, node: ast.Attribute):
        self.generic_visit(node)

    def _visit_args_annotations(self, args: ast.arguments):
        for field in ("posonlyargs", "args", "kwonlyargs"):
            for a in getattr(args, field, []):
                if getattr(a, "annotation", None):
                    self.visit(a.annotation)
        if getattr(args, "vararg", None) and args.vararg.annotation:
            self.visit(args.vararg.annotation)
        if getattr(args, "kwarg", None) and args.kwarg.annotation:
            self.visit(args.kwarg.annotation)

    def visit_FunctionDef(self, node: ast.FunctionDef):
        for d in node.decorator_list:
            self.visit(d)
        if node.returns:
            self.visit(node.returns)
        self._visit_args_annotations(node.args)
        for stmt in node.body:
            self.visit(stmt)

    visit_AsyncFunctionDef = visit_FunctionDef

    def visit_ClassDef(self, node: ast.ClassDef):
        for b in node.bases:
            self.visit(b)
        for kw in node.keywords or []:
            self.visit(kw)
        for d in node.decorator_list:
            self.visit(d)
        for stmt in node.body:
            self.visit(stmt)


def get_source_segment(source: str, node: ast.AST) -> str:
    seg = ast.get_source_segment(source, node)
    return "" if seg is None else seg


def extract_top_level_items(source: str, tree: ast.Module) -> Tuple[List[TopLevelItem], List[str], Optional[str], Optional[str]]:
    """Returns (items, imports, main_block_src, module_docstring)."""
    items: List[TopLevelItem] = []
    imports: List[str] = []
    main_block: Optional[str] = None

    module_doc = ast.get_docstring(tree)

    # Collect candidate top-level names first (to resolve dependencies later)
    top_names: Set[str] = set()
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            top_names.add(node.name)
        elif isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name):
                    top_names.add(t.id)
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            top_names.add(node.target.id)

    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            imports.append(get_source_segment(source, node).rstrip())
        elif (
            isinstance(node, ast.If)
            and isinstance(node.test, ast.Compare)
            and isinstance(node.test.left, ast.Name)
            and node.test.left.id == "__name__"
        ):
            seg = get_source_segment(source, node)
            if seg:
                main_block = seg
        elif isinstance(node, ast.ClassDef):
            items.append(TopLevelItem(node.name, "class", node, get_source_segment(source, node)))
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            items.append(TopLevelItem(node.name, "func", node, get_source_segment(source, node)))
        elif isinstance(node, ast.Assign):
            seg = get_source_segment(source, node)
            for t in node.targets:
                if isinstance(t, ast.Name):
                    items.append(TopLevelItem(t.id, "assign", node, seg))
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            seg = get_source_segment(source, node)
            items.append(TopLevelItem(node.target.id, "assign", node, seg))
        else:
            pass

    # Dependencies
    name_set = {i.name for i in items}
    for it in items:
        v = DependencyVisitor(name_set)
        v.visit(it.node)
        v.used.discard(it.name)
        it.deps = v.used

    return items, imports, main_block, module_doc

# ---------- SCC ----------


def strongly_connected_components(graph: Dict[str, Set[str]]) -> List[List[str]]:
    """
    Tarjan's algorithm to compute strongly connected components.

    We use SCCs so that mutually-dependent top-level symbols (A uses B and B uses A)
    end up in the same module, preventing circular import issues across files.
    """
    index = 0
    indices: Dict[str, int] = {}
    lowlink: Dict[str, int] = {}
    stack: List[str] = []
    onstack: Set[str] = set()
    components: List[List[str]] = []

    sys.setrecursionlimit(max(10000, sys.getrecursionlimit()))

    def strongconnect(v: str):
        nonlocal index
        indices[v] = index
        lowlink[v] = index
        index += 1
        stack.append(v)
        onstack.add(v)

        for w in graph.get(v, set()):
            if w not in indices:
                strongconnect(w)
                lowlink[v] = min(lowlink[v], lowlink[w])
            elif w in onstack:
                lowlink[v] = min(lowlink[v], indices[w])

        if lowlink[v] == indices[v]:
            comp = []
            while True:
                w = stack.pop()
                onstack.remove(w)
                comp.append(w)
                if w == v:
                    break
            components.append(comp)

    for v in graph:
        if v not in indices:
            strongconnect(v)

    return components

# ---------- Component construction ----------


def build_components(items: List[TopLevelItem]) -> Tuple[List[Component], Dict[str, str]]:
    """
    Group top-level items into SCC-based components and assign initial module names.

    Returns:
      components: list of Component objects
      name_to_module: mapping from top-level symbol -> proposed module name
    """
    item_by_name = {it.name: it for it in items}
    graph: Dict[str, Set[str]] = {it.name: set(it.deps) for it in items}
    sccs = strongly_connected_components(graph)

    components: List[Component] = []
    name_to_module: Dict[str, str] = {}

    for comp_names in sccs:
        comp_items = [item_by_name[n] for n in comp_names]
        comp_items.sort(key=lambda x: x.name.lower())
        module = module_name_for_component([it.name for it in comp_items])
        components.append(
            Component(names=[it.name for it in comp_items], items=comp_items, module_name=module)
        )
        for n in comp_names:
            name_to_module[n] = module

    # Coarse ordering by external dependency count (those with deps come later).
    def external_dep_count(c: Component) -> int:
        s = set(c.names)
        deps = set()
        for n in c.names:
            deps |= graph.get(n, set())
        return len([d for d in deps if d not in s])

    components.sort(key=external_dep_count)
    return components, name_to_module

# ---------- Re-pack (GROUPING / PACKAGING) ----------


def _item_lines(it: TopLevelItem) -> int:
    return len(it.source.splitlines()) if it.source else 0


def _comp_lines(c: Component) -> int:
    return sum(_item_lines(it) for it in c.items)


def _assign_only(c: Component) -> bool:
    return all(it.kind == "assign" for it in c.items)


def merge_components(a: Component, b: Component, new_name: Optional[str] = None) -> Component:
    names = a.names + b.names
    items = a.items + b.items
    mod_name = new_name or module_name_for_component(names)
    return Component(names=names, items=items, module_name=mod_name)


def rebuild_name_to_module(components: List[Component]) -> Dict[str, str]:
    """Rebuild name->module mapping after components have been merged/renamed."""
    m: Dict[str, str] = {}
    for c in components:
        for it in c.items:
            m[it.name] = c.module_name
    return m


def repack_components(
    base_file_stem: str,
    components: List[Component],
    name_to_module: Dict[str, str],
    *,
    group_assignments: bool = True,
    pack_small_lines: int = 40,
    max_modules: int = 12,
    min_module_lines: int = 0,
    target_modules: Optional[int] = None,
) -> Tuple[List[Component], Dict[str, str]]:
    """
    Apply practical packing heuristics to reduce module count and produce tidy package layout.

    Heuristics:
      1) Group pure assignment components into a 'constants' module.
      2) Pack very small modules into a 'core' module (threshold: pack_small_lines).
      3) Limit module count by repeatedly merging the two smallest movable modules.
      3.5) Ensure each module is at least `min_module_lines` lines by merging small ones.
      4) If `target_modules` set, further shrink to that exact count.

    Returns:
      (updated_components, updated_name_to_module)
    """
    comps = list(components)

    # 1) Group assignments into a single module
    if group_assignments:
        assign_comps = [c for c in comps if _assign_only(c)]
        if len(assign_comps) > 1:
            merged = assign_comps[0]
            for c in assign_comps[1:]:
                merged = merge_components(merged, c)
            merged.module_name = "constants"
            comps = [c for c in comps if c not in assign_comps] + [merged]

    # 2) Pack small modules into 'core'
    if pack_small_lines and pack_small_lines > 0:
        small = [c for c in comps if _comp_lines(c) < pack_small_lines and not _assign_only(c)]
        if len(small) > 1:
            core = small[0]
            for c in small[1:]:
                core = merge_components(core, c)
            core.module_name = "core"
            comps = [c for c in comps if c not in small] + [core]

    # Helper: merge the two smallest movable components once
    def merge_smallest_once() -> bool:
        pinned = {"constants", "core"}
        movable = [c for c in comps if c.module_name not in pinned]
        if len(movable) < 2:
            return False
        movable.sort(key=_comp_lines)
        a, b = movable[0], movable[1]
        merged = merge_components(a, b)
        comps[:] = [c for c in comps if c not in (a, b)] + [merged]
        return True

    # 3) Limit the number of modules (keep constants/core intact)
    while max_modules and len(comps) > max_modules:
        if not merge_smallest_once():
            break

    # 3.5) Merge until the minimum lines threshold is met
    if min_module_lines and min_module_lines > 0:
        changed = True
        while changed:
            changed = False
            # If smallest modules are below threshold, merge them
            smallers = [c for c in comps if _comp_lines(c) < min_module_lines and c.module_name not in {"constants", "core"}]
            smallers.sort(key=_comp_lines)
            for s in list(smallers):
                # Merge with another smallest module
                others = [c for c in comps if c is not s and c.module_name not in {"constants", "core"}]
                if not others:
                    break
                others.sort(key=_comp_lines)
                merged = merge_components(s, others[0])
                comps[:] = [c for c in comps if c not in (s, others[0])] + [merged]
                changed = True
                break

    # 4) Reduce to target module count
    if target_modules is not None and target_modules > 0:
        while len(comps) > target_modules:
            if not merge_smallest_once():
                break

    # 5) Rebuild mapping from scratch
    name_to_module = rebuild_name_to_module(comps)
    return comps, name_to_module

# ---------- Renderers ----------

HEADER = "# Generated by autoparts.py — DO NOT EDIT BY HAND\n"


def _dedup_imports(imports: Sequence[str]) -> List[str]:
    """Keep import statements unique while preserving order of first occurrence."""
    seen = set()
    out: List[str] = []
    for line in imports:
        key = line.strip()
        if key and key not in seen:
            seen.add(key)
            out.append(key)
    return out


def render_module(
    component: Component,
    all_imports: List[str],
    name_to_module: Dict[str, str],
) -> str:
    """
    Emit a module file:
      - header
      - de-duplicated imports (original top-level imports from the source file)
      - intra-package imports for cross-component dependencies
      - original source blocks (verbatim) for each item
      - __all__ for explicit exports
    """
    lines: List[str] = [HEADER]

    dedup_imps = _dedup_imports(all_imports)
    if dedup_imps:
        lines.extend(dedup_imps)
        lines.append("")

    own = set(component.names)
    external_deps: Dict[str, List[str]] = {}
    for it in component.items:
        for dep in it.deps:
            if dep not in own:
                mod = name_to_module.get(dep)
                if mod:
                    external_deps.setdefault(mod, []).append(dep)

    for mod, names in sorted(external_deps.items()):
        unique_names = sorted(set(names))
        joined = ", ".join(unique_names)
        lines.append(f"from .{mod} import {joined}")
    if external_deps:
        lines.append("")

    for it in component.items:
        src = it.source.rstrip()
        lines.append(src)
        lines.append("")

    exports = ", ".join(repr(n) for n in component.names)
    lines.append(f"__all__ = [{exports}]")
    lines.append("")
    return "\n".join(lines)


def render_init(components: List[Component], pkg_doc: Optional[str]) -> str:
    """Emit package __init__.py that re-exports symbols from all component modules."""
    lines = [HEADER]
    if pkg_doc:
        lines.append('"""')
        lines.append(pkg_doc.strip())
        lines.append('"""')
        lines.append("")
    all_names: List[str] = []
    for c in components:
        joined = ", ".join(c.names)
        if joined:
            lines.append(f"from .{c.module_name} import {joined}")
            all_names.extend(c.names)
    lines.append("")
    exports = ", ".join(repr(n) for n in sorted(set(all_names)))
    lines.append(f"__all__ = [{exports}]")
    lines.append("")
    return "\n".join(lines)


def extract_main_block_code(main_block_src: str) -> str:
    """Extract the body of `if __name__ == '__main__':` block to place into __main__.py."""
    try:
        node = ast.parse(main_block_src)
        for n in node.body:
            if isinstance(n, ast.If):
                body_texts = []
                for stmt in n.body:
                    seg = ast.get_source_segment(main_block_src, stmt)
                    if seg:
                        body_texts.append(seg)
                return "\n\n".join(body_texts).strip() + "\n"
    except Exception:
        pass
    return main_block_src


def render_main(init_reexport: bool, main_body: str) -> str:
    """Emit __main__.py optionally re-exporting package names, then running original main body."""
    lines = [HEADER]
    if init_reexport:
        lines.append("from . import *  # re-exported names from package")
        lines.append("")
    lines.append(main_body.rstrip())
    lines.append("")
    return "\n".join(lines)

# ---------- Single-file processing ----------


def plan_and_write_single(
    input_file: Path,
    out_dir: Optional[Path],
    pkg_name: Optional[str],
    dry_run: bool,
    force: bool,
    *,
    group_assignments: bool,
    pack_small_lines: int,
    max_modules: int,
    min_module_lines: int = 0,
    target_modules: Optional[int] = None,
    ai_name: bool = False,
    ai_provider: Optional[str] = None,
    ai_model: Optional[str] = None,
    ai_base_url: Optional[str] = None,
    verbose: bool = True,
) -> bool:
    """Split a single Python file into a package of modules and write them. Returns True on success."""
    try:
        src = read_text(input_file)
    except Exception as e:
        print(f"[!] {input_file}: could not be read: {e}", file=sys.stderr)
        return False

    try:
        tree = ast.parse(src)
    except SyntaxError as e:
        print(f"[!] {input_file}: SyntaxError: {e}", file=sys.stderr)
        return False

    items, imports, main_block, mod_doc = extract_top_level_items(src, tree)
    if not items:
        if verbose:
            print(f"[-] {input_file}: no top-level definitions, skipping.")
        return False

    components, name_to_module = build_components(items)

    # Re-pack
    components, name_to_module = repack_components(
        base_file_stem=input_file.stem,
        components=components,
        name_to_module=name_to_module,
        group_assignments=group_assignments,
        pack_small_lines=pack_small_lines,
        max_modules=max_modules,
        min_module_lines=min_module_lines,
        target_modules=target_modules,
    )

    if verbose:
        print(f"\n== Split Plan: {input_file.name} ==")
        for c in components:
            print(f"  - {c.module_name}: {', '.join(c.names)}  (~{_comp_lines(c)} lines)")
        if main_block:
            print("  - __main__.py: if __name__ == '__main__' block will be moved")
        print("")

    if dry_run:
        return True

    # Final package name: CLI > AI > heuristic > filename
    final_pkg_name = pkg_name
    if final_pkg_name:
        final_pkg_name = to_snake(final_pkg_name)
    if not final_pkg_name and ai_name:
        ai = ai_suggest_name(
            input_file, src, tree, items,
            provider=ai_provider, model=ai_model, base_url=ai_base_url,
        )
        if ai:
            final_pkg_name = ai
            if verbose:
                print(f"[i] AI package name: {final_pkg_name}")
    if not final_pkg_name:
        final_pkg_name = local_heuristic_name(input_file, src, tree, items)
        if verbose:
            print(f"[i] Heuristic package name: {final_pkg_name}")

    package_dir = (out_dir or input_file.parent) / final_pkg_name

    if package_dir.exists() and not force:
        print(
            f"[!] Output directory already exists: {package_dir}  (use --force to overwrite)",
            file=sys.stderr,
        )
        return False
    package_dir.mkdir(parents=True, exist_ok=True)

    # Prevent module-name collisions within the package
    used_mod_names: Set[str] = set()
    for comp in components:
        comp.module_name = ensure_unique_module_name(comp.module_name, used_mod_names)

    # Write modules
    for comp in components:
        mod_path = package_dir / f"{comp.module_name}.py"
        text = render_module(comp, imports, name_to_module)
        write_text(mod_path, text)

    # __init__.py
    init_text = render_init(components, pkg_doc=mod_doc)
    write_text(package_dir / "__init__.py", init_text)

    # __main__.py (if present)
    if main_block:
        body = extract_main_block_code(main_block)
        main_text = render_main(init_reexport=True, main_body=body)
        write_text(package_dir / "__main__.py", main_text)

    print(f"[✓] Package ready: {package_dir}")
    return True

# ---------- Batch mode ----------


def discover_python_files(
    root: Path,
    recursive: bool,
    include_globs: Sequence[str],
    exclude_globs: Sequence[str],
    ignore_tests: bool,
    min_lines: int,
) -> List[Path]:
    """
    Find Python files under a root directory according to include/exclude patterns.

    Notes:
      - Skips __init__.py.
      - If `ignore_tests`, excludes common test paths/globs.
      - If `min_lines` > 0, skips files with fewer lines than the threshold.
    """
    files: List[Path] = []

    candidates: List[Path] = []
    if recursive:
        for pat in include_globs:
            candidates.extend(root.rglob(pat))
    else:
        for pat in include_globs:
            candidates.extend(root.glob(pat))

    ex_patterns = list(exclude_globs)
    if ignore_tests:
        ex_patterns += ["tests/**", "test_*.py", "*_test.py", "**/tests/**", "**/test/**"]
    ex_patterns = list(dict.fromkeys(ex_patterns))

    def is_excluded(p: Path) -> bool:
        sp = p.as_posix()
        for pat in ex_patterns:
            if Path(sp).match(pat) or p.match(pat):
                return True
        return False

    for p in candidates:
        if not p.is_file():
            continue
        if p.name == "__init__.py":
            continue
        if is_excluded(p):
            continue
        try:
            if min_lines > 0 and sum(1 for _ in p.open("r", encoding="utf-8")) < min_lines:
                continue
        except Exception:
            pass
        files.append(p)

    files.sort(key=lambda x: x.as_posix())
    return files


def batch_process(
    inputs: List[Path],
    out_dir: Optional[Path],
    dry_run: bool,
    force: bool,
    recursive: bool,
    include_globs: Sequence[str],
    exclude_globs: Sequence[str],
    ignore_tests: bool,
    min_lines: int,
    pkg_prefix: str,
    group_assignments: bool,
    pack_small_lines: int,
    max_modules: int,
    min_module_lines: int,
    target_modules: Optional[int],
    ai_name: bool,
    ai_provider: Optional[str],
    ai_model: Optional[str],
    ai_base_url: Optional[str],
) -> int:
    """
    Process multiple files or directories in batch:
      - Discovers .py files under provided paths (honoring patterns/options).
      - For each file, runs the single-file plan & write flow.
      - Optionally renames the most-recently created package with a prefix.
    """
    to_process: List[Path] = []
    for inp in inputs:
        if inp.is_dir():
            files = discover_python_files(
                inp, recursive, include_globs, exclude_globs, ignore_tests, min_lines
            )
            print(f"[i] {inp}: {len(files)} file(s) found.")
            to_process.extend(files)
        elif inp.is_file() and inp.suffix == ".py":
            to_process.append(inp)
        else:
            print(f"[-] Skipped (not a .py file): {inp}")

    if not to_process:
        print("[!] No files to process found.")
        return 0

    ok = 0
    for f in to_process:
        pkg_name = None  # In batch mode, AI/heuristic will decide
        if pkg_prefix:
            # The prefix will be applied after creation by renaming
            pass
        success = plan_and_write_single(
            input_file=f,
            out_dir=out_dir,
            pkg_name=pkg_name,
            dry_run=dry_run,
            force=force,
            group_assignments=group_assignments,
            pack_small_lines=pack_small_lines,
            max_modules=max_modules,
            min_module_lines=min_module_lines,
            target_modules=target_modules,
            ai_name=ai_name,
            ai_provider=ai_provider,
            ai_model=ai_model,
            ai_base_url=ai_base_url,
            verbose=True,
        )
        if success:
            # After creation, if a prefix is requested, rename the latest created package dir.
            if pkg_prefix:
                # Determine output root
                out_root = out_dir or f.parent
                # Simple approach: pick the newest directory under output root
                try:
                    candidates = [p for p in out_root.iterdir() if p.is_dir()]
                    latest = max(candidates, key=lambda p: p.stat().st_mtime)
                    new_name = to_snake(pkg_prefix + latest.name)
                    latest.rename(out_root / new_name)
                    print(f"[i] Package renamed: {latest.name} -> {new_name}")
                except Exception:
                    pass
            ok += 1

    print(f"\n[✓] Batch process completed. Successful: {ok}/{len(to_process)}")
    return ok

# ---------- CLI ----------


def main():
    ap = argparse.ArgumentParser(
        description=(
            "Helper to split single-file Python code into modules and package them (single or batch).\n"
            "Includes AI-assisted naming and compact mode options."
        )
    )
    ap.add_argument("inputs", nargs="+", help=".py file(s) or directories to split")
    ap.add_argument("-o", "--out-dir", default=None, help="Output root directory (default: source file location)")
    ap.add_argument("--pkg-name", default=None, help="[SINGLE FILE] Package name to create (default: AI/heuristic)")
    ap.add_argument("--pkg-prefix", default="", help="[BATCH] Prefix to add to package names (e.g., proj_)")
    ap.add_argument("--dry-run", action="store_true", help="Only print the plan, do not write files")
    ap.add_argument("--force", action="store_true", help="Overwrite output directory if it exists")

    # Batch mode options
    ap.add_argument("--batch", action="store_true", help="Run in batch mode for directory inputs")
    ap.add_argument("--recursive", action="store_true", help="Scan subdirectories in batch mode")
    ap.add_argument("--include", action="append", default=["*.py"], help="Include patterns (glob). Can be used multiple times.")
    ap.add_argument("--exclude", action="append", default=[], help="Exclude patterns (glob). Can be used multiple times.")
    ap.add_argument("--ignore-tests", action="store_true", help="Skip tests/ directories and test files")
    ap.add_argument("--min-lines", type=int, default=0, help="Skip files with fewer lines than this (e.g., 80)")

    # Grouping/pack options (legacy + new)
    ap.set_defaults(group_assignments=True)
    ap.add_argument("--no-group-assignments", dest="group_assignments", action="store_false", help="Disable grouping assignments into a single module")
    ap.add_argument("--pack-small-lines", type=int, default=40, help="Collect modules below this line count into 'core' (0=off)")
    ap.add_argument("--max-modules", type=int, default=12, help="Maximum number of modules (merges smallest except constants/core)")
    ap.add_argument("--min-module-lines", type=int, default=0, help="Minimum lines per module; merge below this (0=off)")
    ap.add_argument("--target-modules", type=int, default=None, help="Target module count; merge smallest to reach it")

    # COMPACT preset
    ap.add_argument("--compact", type=int, choices=[0, 1, 2, 3], default=None, help="0=off, 1=low, 2=medium, 3=aggressive module reduction")

    # AI naming
    ap.add_argument("--ai-name", action="store_true", help="Suggest package name with AI")
    ap.add_argument("--ai-provider", choices=["openai", "ollama"], default=None, help="AI provider")
    ap.add_argument("--ai-model", default=None, help="AI model (e.g., gpt-4o-mini / mistral)")
    ap.add_argument("--ai-base-url", default=None, help="AI API base URL (optional)")

    args = ap.parse_args()

    # Apply compact preset
    min_module_lines = args.min_module_lines
    pack_small_lines = args.pack_small_lines
    max_modules = args.max_modules
    target_modules = args.target_modules

    if args.compact is not None and args.compact > 0:
        level = args.compact
        if level == 1:
            pack_small_lines = max(pack_small_lines, 80)
            max_modules = min(max_modules, 10)
            min_module_lines = max(min_module_lines, 40)
        elif level == 2:
            pack_small_lines = max(pack_small_lines, 120)
            max_modules = min(max_modules, 8)
            min_module_lines = max(min_module_lines, 80)
            target_modules = min(target_modules or 8, 8)
        elif level == 3:
            pack_small_lines = max(pack_small_lines, 160)
            max_modules = min(max_modules, 6)
            min_module_lines = max(min_module_lines, 120)
            target_modules = min(target_modules or 6, 6)

    out_dir = Path(args.out_dir).resolve() if args.out_dir else None

    input_paths = [Path(p).resolve() for p in args.inputs]
    any_dirs = any(p.is_dir() for p in input_paths)

    if args.batch or any_dirs or len(input_paths) > 1:
        batch_process(
            inputs=input_paths,
            out_dir=out_dir,
            dry_run=args.dry_run,
            force=args.force,
            recursive=args.recursive,
            include_globs=args.include,
            exclude_globs=args.exclude,
            ignore_tests=args.ignore_tests,
            min_lines=args.min_lines,
            pkg_prefix=args.pkg_prefix,
            group_assignments=args.group_assignments,
            pack_small_lines=pack_small_lines,
            max_modules=max_modules,
            min_module_lines=min_module_lines,
            target_modules=target_modules,
            ai_name=args.ai_name,
            ai_provider=args.ai_provider,
            ai_model=args.ai_model,
            ai_base_url=args.ai_base_url,
        )
    else:
        input_file = input_paths[0]
        if not input_file.exists():
            print(f"[!] Input not found: {input_file}", file=sys.stderr)
            sys.exit(1)
        plan_and_write_single(
            input_file=input_file,
            out_dir=out_dir,
            pkg_name=args.pkg_name,
            dry_run=args.dry_run,
            force=args.force,
            group_assignments=args.group_assignments,
            pack_small_lines=pack_small_lines,
            max_modules=max_modules,
            min_module_lines=min_module_lines,
            target_modules=target_modules,
            ai_name=args.ai_name,
            ai_provider=args.ai_provider,
            ai_model=args.ai_model,
            ai_base_url=args.ai_base_url,
            verbose=True,
        )


if __name__ == "__main__":
    main()
