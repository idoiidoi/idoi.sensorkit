"""Tiny builder for Max patcher JSON, used by tools/make_help.py."""

import json
from pathlib import Path


class Patch:
    def __init__(self, title, subtitle, rect):
        self.boxes = []
        self.lines = []
        self.rect = rect
        self._n = 0
        self.comment(title, 20, 12, 400, 32, fontsize=22.0, fontface=1)
        self.comment(subtitle, 20, 44, 640)

    # --- boxes ---------------------------------------------------------------

    def box(self, maxclass, rect, text=None, inlets=1, outlets=0, outlettype=None, **extra):
        self._n += 1
        b = {
            "id": f"obj-{self._n}",
            "maxclass": maxclass,
            "numinlets": inlets,
            "numoutlets": outlets,
            "patching_rect": [float(v) for v in rect],
        }
        if outlets:
            b["outlettype"] = outlettype or [""] * outlets
        if text is not None:
            b["text"] = text
        b.update(extra)
        self.boxes.append({"box": b})
        return b["id"]

    def obj(self, text, x, y, w=None, inlets=1, outlets=1, outlettype=None):
        return self.box("newobj", (x, y, w or max(40, 7 * len(text) + 14), 22), text,
                        inlets, outlets, outlettype)

    def msg(self, text, x, y, w=None):
        return self.box("message", (x, y, w or max(30, 7 * len(text) + 14), 22), text, 2, 1, [""])

    def toggle(self, x, y):
        return self.box("toggle", (x, y, 20, 20), None, 1, 1, ["int"], parameter_enable=0)

    def button(self, x, y):
        return self.box("button", (x, y, 20, 20), None, 1, 1, ["bang"], parameter_enable=0)

    def number(self, x, y, w=50, flo=False, minimum=None):
        extra = {"minimum": minimum} if minimum is not None else {}
        return self.box("flonum" if flo else "number", (x, y, w, 22), None, 1, 2,
                        ["", "bang"], parameter_enable=0, **extra)

    def comment(self, text, x, y, w=260, h=None, **extra):
        return self.box("comment", (x, y, w, h or 20 * (text.count("\n") + 1)), text, 1, 0, **extra)

    def v8ui(self, filename, rect, outlets=1, **extra):
        return self.box("v8ui", rect, None, 1, outlets, [""] * outlets,
                        filename=filename, parameter_enable=0, border=0, **extra)

    def display(self, x, y, w=300):
        """[prepend set] -> empty message box, returns the prepend inlet."""
        p = self.obj("prepend set", x, y, 80)
        m = self.box("message", (x + 90, y, w, 22), "", 2, 1, [""])
        self.connect(p, m)
        return p

    def connect(self, src, dst, outlet=0, inlet=0):
        self.lines.append({"patchline": {"source": [src, outlet], "destination": [dst, inlet]}})

    # --- labelled control column ----------------------------------------------

    def controls(self, target, x, y, note_x=190, note_w=280):
        """Returns a function adding one labelled control row wired to `target`."""
        state = {"y": y}

        def add(label, note, kind="msg", flo=False, minimum=None, width=None):
            state["y"] += 26
            yy = state["y"]
            widget = None
            if kind == "msg":
                m = self.msg(label, x, yy, width)
            elif kind == "toggle":
                widget = self.toggle(x, yy + 1)
                m = self.msg(label, x + 28, yy, width)
                self.connect(widget, m)
            elif kind == "number":
                widget = self.number(x, yy, flo=flo, minimum=minimum)
                m = self.msg(label, x + 56, yy, width)
                self.connect(widget, m)
            else:
                raise ValueError(kind)
            self.connect(m, target)
            nlines = note.count("\n") + 1
            self.comment(note, x + note_x, yy + 1, note_w)
            state["y"] += 20 * (nlines - 1)
            return widget

        add.state = state
        return add

    # --- output -----------------------------------------------------------------

    def save(self, path):
        patcher = {
            "patcher": {
                "fileversion": 1,
                "appversion": {"major": 9, "minor": 1, "revision": 0, "architecture": "x64", "modernui": 1},
                "classnamespace": "box",
                "rect": [float(v) for v in self.rect],
                "gridsize": [15.0, 15.0],
                "boxes": self.boxes,
                "lines": self.lines,
                "dependency_cache": [],
                "autosave": 0,
            }
        }
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(patcher, indent="\t", ensure_ascii=False) + "\n")
        print(f"wrote {path}")
