#!/usr/bin/env python3
"""Generate the help patches and the overview patch of idoi.sensorkit.

The patches are generated so that their layout stays consistent and diffs
stay readable. Edit this script and run `python3 tools/make_help.py`.
"""

from pathlib import Path

from maxpat import Patch

ROOT = Path(__file__).resolve().parent.parent
HELP = ROOT / "help"
DEMO_CSV = "idoi.sensorkit.demo.csv"


def demo_source(p, x, y, channels=3):
    """metro-driven fake sensor data. Returns the [pack] box.

    ch0 = sin, ch1 = cos at another rate (a Lissajous figure in xy mode),
    ch2 = noise.
    """
    p.comment(f"demo data: {channels} channels at 50 Hz", x, y, 260)
    t_on = p.toggle(x, y + 24)
    loadmess = p.obj("loadmess 1", x + 30, y + 24)
    metro = p.obj("metro 20", x, y + 52, inlets=2, outlets=1, outlettype=["bang"])
    trig = p.obj("t b b", x, y + 80, inlets=1, outlets=2, outlettype=["bang", "bang"])
    cnt = p.obj("counter", x, y + 108, inlets=3, outlets=4, outlettype=["int", "", "", "int"])
    pack_text = "pack " + " ".join(["0."] * channels)
    pack = p.obj(pack_text, x, y + 172, inlets=channels, outlets=1)
    split = p.obj("t i i", x + 60, y + 108, inlets=1, outlets=2, outlettype=["int", "int"])
    sine = p.obj("expr sin($i1 * 0.05)", x, y + 136)
    cosine = p.obj("expr cos($i1 * 0.08)", x + 150, y + 108)
    p.connect(loadmess, t_on)
    p.connect(t_on, metro)
    p.connect(metro, trig)
    p.connect(trig, cnt, 0)
    p.connect(cnt, split)
    # right outlet first: cosine (cold inlet of pack) before sine (hot)
    p.connect(split, cosine, 1)
    p.connect(split, sine, 0)
    p.connect(sine, pack, 0, 0)
    p.connect(cosine, pack, 0, 1)
    if channels >= 3:
        rnd = p.obj("random 1000", x + 150, y + 136, inlets=2, outlets=1, outlettype=["int"])
        rsc = p.obj("expr $i1 * 0.0005 - 0.25", x + 150, y + 164)
        # the noise must be in pack before sine arrives: trigger it first (right outlet)
        p.connect(trig, rnd, 1)
        p.connect(rnd, rsc)
        p.connect(rsc, pack, 0, 2)
    return pack


def sync_toggle(p, widget, name, x, y):
    """[r name] -> [prepend set] -> widget, so an outlet can update a toggle."""
    r = p.obj(f"r {name}", x, y, 110)
    s = p.obj("prepend set", x + 120, y, 80)
    p.connect(r, s)
    p.connect(s, widget)


# =============================================================================
# idoi.plotter

def plotter_help():
    p = Patch("idoi.plotter", "Real-time multi-channel time series / x-y plotter (v8ui, Max 9+)",
              (100, 80, 900, 860))
    pack = demo_source(p, 20, 76)
    p.comment("Send a list (one value per channel)\nor a single float.", 130, 248, 240)
    p.comment("mouse:\n  drag = zoom around the cursor (shift = fine)\n"
              "  cmd/ctrl + drag = move the range\n  double click = toggle autoscale",
              20, 300, 330)

    plotter = p.v8ui("idoi.plotter.js", (20, 470, 840, 240))
    p.connect(pack, plotter)

    X = 400
    p.comment("messages / attributes", X, 76, 200, fontface=1)
    add = p.controls(plotter, X, 76)
    t_auto = add("autoscale $1", "auto range (double click toggles)", "toggle")
    sync_toggle(p, t_auto, "plotter.help.autoscale", X - 230, add.state["y"])
    add("ybounds -1.5 1.5", "fixed Y range, turns autoscale off")
    add("mode xy", "pairs (0,1), (2,3) ... as x/y trails")
    add("mode time", "one line per channel (default)")
    add("smooth $1", "moving average window (1 = raw)", "number", minimum=1)
    add("samples $1", "buffer length (trail length in xy mode)", "number", minimum=2)
    add("linewidth $1", "line width in pixels", "number", flo=True, minimum=0.1)
    add("gridx $1", "vertical grid every N samples (0 = off)", "number", minimum=0)
    add("legend $1", "channel names + latest values", "toggle")
    add("names sin cos noise", "channel names")
    add("setcolor 0 0. 0. 0.", "color of channel 0 (r g b, 0-1)")
    add("pause $1", "freeze the display", "toggle")
    add("reset", "clear data, back to autoscale")

    route = p.obj("route autoscale", 20, 720, 110, inlets=2, outlets=2)
    s_auto = p.obj("s plotter.help.autoscale", 20, 750, 170, outlets=0)
    view = p.display(220, 750, 360)
    p.connect(plotter, route)
    p.connect(route, s_auto)
    p.connect(route, view, 1)
    p.comment("mouse zoom / pan / double click (and load) report\nautoscale, ybounds and in xy mode xbounds.",
              220, 780, 360)
    p.save(HELP / "idoi.plotter.maxhelp")


# =============================================================================
# idoi.datarecorder

def recorder_help():
    p = Patch("idoi.datarecorder", "Record lists to timestamped CSV files (v8ui, Max 9+)",
              (100, 80, 900, 740))
    pack = demo_source(p, 20, 76, channels=2)
    p.comment("Each list, number or message that\narrives while recording becomes one row.", 20, 276, 280)

    # this help records to ~/Documents so test takes do not pile up inside the package
    rec = p.v8ui("idoi.datarecorder.js", (20, 330, 330, 56),
                 embedstate=[["folder", "~/Documents"]])
    p.comment("click to start / stop", 360, 348, 200)
    p.connect(pack, rec)

    X = 400
    p.comment("messages / attributes", X, 76, 200, fontface=1)
    add = p.controls(rec, X, 76)
    t_rec = add("record $1", "start / stop (no argument toggles)", "toggle")
    sync_toggle(p, t_rec, "recorder.help.rec", X - 230, add.state["y"])
    add("marker take1", "any message is recorded with its name first")
    add("prefix take_", "file name prefix: take_20261004_231500.csv")
    add("columns sin cos", "header names (missing ones become ch<N>)")
    add("header $1", "write a header row", "toggle")
    add("elapsed $1", "add an elapsed_ms column", "toggle")

    add.state["y"] += 26
    y = add.state["y"]
    choose = p.button(X, y + 1)
    dialog = p.obj("opendialog fold", X + 28, y, 110, inlets=2, outlets=2, outlettype=["", "bang"])
    pre = p.obj("prepend folder", X + 28, y + 28, 100)
    p.connect(choose, dialog)
    p.connect(dialog, pre)
    p.connect(pre, rec)
    p.comment("choose the folder (this help uses ~/Documents;\nunset, files go next to the patcher)",
              X + 190, y + 1, 300)
    add.state["y"] += 28
    add("clear", "unset the folder (next to the patcher,\nor ~/Documents if unsaved)")

    route = p.obj("route recording file rows done error", 20, 400, 250, inlets=1, outlets=6)
    s_rec = p.obj("s recorder.help.rec", 20, 430, 130, outlets=0)
    p.connect(rec, route)
    p.connect(route, s_rec, 0)
    for i in range(1, 5):
        d = p.display(160, 430 + (i - 1) * 44, 620)
        p.connect(route, d, i)
    p.comment("outlet: recording 0/1, file <path> on start, rows <n> and done <path>\non stop, error <text>. "
              "Send done <path> as read <path> to idoi.dataplayer to play it back.", 20, 610, 620)
    p.save(HELP / "idoi.datarecorder.maxhelp")


# =============================================================================
# idoi.dataplayer

def player_help():
    p = Patch("idoi.dataplayer", "Play back CSV recordings with their original timing (v8ui, Max 9+)",
              (100, 80, 900, 820))
    player = p.box("v8ui", (20, 90, 360, 48), None, 1, 3, ["", "", ""],
                   filename="idoi.dataplayer.js", parameter_enable=0, border=0,
                   embedstate=[["file", DEMO_CSV]])
    p.comment("click the triangle to play / pause,\nclick or drag the bar to seek", 20, 144, 300)

    X = 420
    p.comment("messages / attributes", X, 76, 200, fontface=1)
    add = p.controls(player, X, 76, note_x=170, note_w=290)
    t_play = add("$1", "1 = play, 0 = pause", "toggle")
    sync_toggle(p, t_play, "player.help.playing", X - 230, add.state["y"])
    add("play", "play from the current position")
    add("stop", "pause and go back to the start")
    add("loop $1", "loop at the end", "toggle")
    speed = add("speed $1", "playback speed (1 = original)", "number", flo=True)
    init = p.obj("loadmess set 1.", X - 120, add.state["y"], 100)
    p.connect(init, speed)
    add("seek 5000", "jump to 5000 ms (skipped rows are not output)")
    add("locate 0.5", "jump to the middle (0-1)")
    add(f"read {DEMO_CSV}", "load a file (also @file, saved)")

    add.state["y"] += 26
    y = add.state["y"]
    choose = p.button(X, y + 1)
    dialog = p.obj("opendialog", X + 28, y, 80, inlets=2, outlets=2, outlettype=["", "bang"])
    pre = p.obj("prepend read", X + 28, y + 28, 90)
    p.connect(choose, dialog)
    p.connect(dialog, pre)
    p.connect(pre, player)
    p.comment("choose a CSV written by idoi.datarecorder", X + 170, y + 1, 290)

    # outputs
    p.comment("left: data rows", 20, 190, 200, fontface=1)
    p.comment("middle: marker rows", 20, 236, 200, fontface=1)
    markers = p.display(20, 260, 250)
    p.connect(player, markers, 1)
    p.comment("right: info", 20, 296, 200, fontface=1)
    route = p.obj("route playing time duration", 20, 320, 220, inlets=1, outlets=4)
    p.connect(player, route, 2)
    s_play = p.obj("s player.help.playing", 20, 350, 140, outlets=0)
    p.connect(route, s_play, 0)
    pos = p.number(170, 350, 70)
    p.connect(route, pos, 1)
    p.comment("ms", 245, 351, 30)
    dur = p.number(280, 350, 70)
    p.connect(route, dur, 2)
    p.comment("duration", 355, 351, 60)
    plotter = p.v8ui("idoi.plotter.js", (20, 440, 840, 220))
    p.connect(player, plotter, 0)
    p.comment("the data rows go into an idoi.plotter", 20, 416, 300)
    rest = p.display(20, 390, 600)
    p.connect(route, rest, 3)
    p.comment("file, columns, end, loop and errors go out the same outlet", 20, 670, 400)
    p.save(HELP / "idoi.dataplayer.maxhelp")


# =============================================================================
# idoi.calibrate

def calibrate_help():
    p = Patch("idoi.calibrate", "Learn sensor ranges, normalize, smooth and deadband (v8, Max 9+)",
              (100, 80, 900, 780))
    p.comment("demo: two raw sensor-like channels", 20, 76, 260)
    t_on = p.toggle(20, 100)
    loadmess = p.obj("loadmess 1", 50, 100)
    metro = p.obj("metro 20", 20, 128, inlets=2, outlets=1, outlettype=["bang"])
    trig = p.obj("t b b", 20, 156, inlets=1, outlets=2, outlettype=["bang", "bang"])
    cnt = p.obj("counter", 20, 186, inlets=3, outlets=4, outlettype=["int", "", "", "int"])
    ch0 = p.obj("expr 512 + 300 * sin($i1 * 0.03)", 20, 214, 230)
    rnd = p.obj("random 60", 260, 186, inlets=2, outlets=1, outlettype=["int"])
    ch1 = p.obj("expr 180 + 40 * sin($i1 * 0.11) + $i2", 120, 242, 260, inlets=2)
    split = p.obj("t i i", 100, 186, inlets=1, outlets=2, outlettype=["int", "int"])
    pack = p.obj("pack 0. 0.", 20, 272, inlets=2, outlets=1)
    p.connect(loadmess, t_on)
    p.connect(t_on, metro)
    p.connect(metro, trig)
    p.connect(trig, rnd, 1)
    p.connect(trig, cnt, 0)
    p.connect(cnt, split)
    # right outlet first: ch1 (cold inlet of pack) before ch0 (hot)
    p.connect(split, ch1, 1)
    p.connect(split, ch0, 0)
    p.connect(rnd, ch1, 0, 1)
    p.connect(ch0, pack, 0, 0)
    p.connect(ch1, pack, 0, 1)
    p.comment("ch0: 212..812 like a 10-bit ADC,\nch1: 140..280 with noise", 120, 270, 260)

    calib = p.obj("v8 idoi.calibrate.js", 20, 310, 150, inlets=1, outlets=2)
    p.connect(pack, calib)

    X = 440
    p.comment("messages / attributes", X, 76, 200, fontface=1)
    add = p.controls(calib, X, 76, note_x=170, note_w=280)
    t_learn = add("learn $1", "1: forget + track min/max, 0: keep", "toggle")
    sync_toggle(p, t_learn, "calibrate.help.learn", X - 230, add.state["y"])
    add("smooth $1", "one-pole smoothing (0 = off, 0.9 = heavy)", "number", flo=True, minimum=0)
    add("deadband $1", "hold output until it moves this much", "number", flo=True, minimum=0)
    add("invert 0 1", "invert channel 1")
    add("outrange -1 1", "output range")
    add("outrange 0 1", "back to 0..1")
    add("clip $1", "clip to the output range", "toggle")
    add("range 0 212 812", "set channel 0 range by hand")
    add("reset", "forget ranges (values pass through)")
    add("dump", "output the current ranges")

    route = p.obj("route learn ranges", 20, 344, 130, inlets=1, outlets=3)
    p.connect(calib, route, 1)
    s_learn = p.obj("s calibrate.help.learn", 20, 374, 150, outlets=0)
    p.connect(route, s_learn, 0)
    ranges = p.display(180, 374, 280)
    p.connect(route, ranges, 1)
    p.comment("the learned ranges are saved with the patcher (@ranges)", 180, 400, 360)

    raw = p.v8ui("idoi.plotter.js", (20, 440, 410, 220), embedstate=[["names", "raw0", "raw1"]])
    cal = p.v8ui("idoi.plotter.js", (450, 440, 410, 220), embedstate=[["names", "cal0", "cal1"]])
    p.connect(pack, raw)
    p.connect(calib, cal, 0)
    p.comment("raw", 20, 664, 100)
    p.comment("calibrated: turn learn on for a few seconds, then off", 450, 664, 400)
    p.save(HELP / "idoi.calibrate.maxhelp")


# =============================================================================
# overview (Extras menu)

def overview():
    p = Patch("idoi.sensorkit", "calibrate -> plot -> record -> play back. "
              "Option-click any object for its help.", (80, 80, 940, 820))
    p.comment("1. a sensor (here: fake data)", 20, 76, 300, fontface=1)
    pack = demo_source(p, 20, 96)

    p.comment("2. idoi.calibrate", 300, 76, 300, fontface=1)
    calib = p.obj("v8 idoi.calibrate.js @smooth 0.5", 300, 100, 220, inlets=1, outlets=2)
    learn = p.toggle(300, 130)
    lm = p.msg("learn $1", 328, 130)
    p.connect(learn, lm)
    p.connect(lm, calib)
    p.comment("learn for a few seconds, then off", 400, 131, 260)
    p.connect(pack, calib)

    p.comment("3. idoi.plotter", 20, 300, 300, fontface=1)
    plot1 = p.v8ui("idoi.plotter.js", (20, 324, 440, 180))
    p.connect(calib, plot1)

    p.comment("4. idoi.datarecorder", 480, 300, 300, fontface=1)
    rec = p.v8ui("idoi.datarecorder.js", (480, 324, 400, 56), embedstate=[["folder", "~/Documents"]])
    p.connect(calib, rec)
    route = p.obj("route done", 480, 390, 80, inlets=2, outlets=2)
    pre = p.obj("prepend read", 480, 420, 90)
    p.connect(rec, route)
    p.connect(route, pre)
    p.comment("a finished take (done <path>) is loaded into the player", 580, 421, 320)

    p.comment("5. idoi.dataplayer -> idoi.plotter in xy mode", 20, 530, 400, fontface=1)
    player = p.box("v8ui", (20, 554, 440, 48), None, 1, 3, ["", "", ""],
                   filename="idoi.dataplayer.js", parameter_enable=0, border=0,
                   embedstate=[["file", DEMO_CSV], ["loop", 1]])
    p.connect(pre, player)
    plot2 = p.v8ui("idoi.plotter.js", (480, 470, 400, 300),
                   embedstate=[["mode", "xy"], ["samples", 200], ["names", "ax", "ay"]])
    p.connect(player, plot2)
    p.comment("play the demo recording, or record a take above;\nchannels (0,1) are drawn as x/y",
              20, 610, 400)
    p.save(ROOT / "extras" / "idoi.sensorkit.maxpat")


if __name__ == "__main__":
    plotter_help()
    recorder_help()
    player_help()
    calibrate_help()
    overview()
