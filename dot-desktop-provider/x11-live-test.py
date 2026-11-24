"""Display-only acceptance test, using an independent Xvfb and trusted fixture."""

import base64
import ctypes as c
import json
import os
from pathlib import Path
import secrets
import select
import struct
import subprocess
from tempfile import TemporaryDirectory
import time
import zlib

here = Path(__file__).resolve().parent
D, U, I = c.c_void_p, c.c_ulong, c.c_int
x = c.CDLL("libX11.so.6")

def bind(name, result, *args):
    function = getattr(x, name)
    function.restype = result
    function.argtypes = args
    return function

def x_display():
    return bind("XOpenDisplay", D, c.c_char_p)(None)

def packet(process, message=None):
    if message:
        process.stdin.write(json.dumps(message) + "\n")
        process.stdin.flush()
    assert select.select([process.stdout], [], [], 4)[0], "X11 helper response timed out"
    line = process.stdout.readline()
    assert line, process.stderr.read()
    return json.loads(line)

def pixels(shot):
    png = base64.b64decode(shot["png"])
    assert png[:8] == b"\x89PNG\r\n\x1a\n"
    assert struct.unpack("!II", png[16:24]) == (1024, 720)
    length, tag = struct.unpack("!I4s", png[33:41])
    assert tag == b"IDAT"
    return zlib.decompress(png[41:41 + length])

def finish(process):
    if process:
        if process.poll() is None:
            process.terminate()
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=3)

with TemporaryDirectory(prefix="qa-dot-x11-") as temp:
    number = next(n for n in range(210, 250) if not Path("/tmp/.X11-unix/X" + str(n)).exists())
    name = ":" + str(number)
    authority = Path(temp) / "Xauthority"
    def field(value):
        return struct.pack("!H", len(value)) + value
    authority.write_bytes(b"\xff\xff" + b"".join(field(part) for part in [
        b"", str(number).encode(), b"MIT-MAGIC-COOKIE-1", secrets.token_bytes(16),
    ]))
    authority.chmod(0o600)
    env = {"PATH": "/usr/bin:/bin", "DISPLAY": name, "XAUTHORITY": str(authority), "HOME": temp}
    server = subprocess.Popen(["/usr/bin/Xvfb", name, "-screen", "0", "1024x720x24", "-nolisten", "tcp",
                               "-auth", str(authority), "-noreset"], env=env)
    control = None
    try:
        deadline = time.monotonic() + 3
        while not Path("/tmp/.X11-unix/X" + str(number)).is_socket():
            assert server.poll() is None and time.monotonic() < deadline
            time.sleep(.03)
        os.environ.update({key: env[key] for key in ("DISPLAY", "XAUTHORITY")})
        d = x_display()
        assert d
        root = bind("XDefaultRootWindow", U, D)(d)
        control = subprocess.Popen(["/usr/bin/python3", str(here / "x11.py")], env=env, text=True,
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        assert packet(control)["ready"]
        original = pixels(packet(control, {"type": "frame"}))
        bind("XSetWindowBackground", I, D, U, U)(d, root, 0x3A1952)
        bind("XClearWindow", I, D, U)(d, root)
        bind("XSync", I, D, I)(d, 0)
        changed = pixels(packet(control, {"type": "frame"}))
        assert changed != original and changed[1:4] == b"\x3a\x19\x52"
        assert packet(control, {"type": "move", "x": 64, "y": 27})["ok"]
        assert packet(control, {"type": "button", "button": "left", "down": True})["ok"]
        root_out, child_out, rx, ry, wx, wy, mask = U(), U(), I(), I(), I(), I(), c.c_uint()
        query = bind("XQueryPointer", I, D, U, *([c.POINTER(U)] * 2), *([c.POINTER(I)] * 4), c.POINTER(c.c_uint))
        assert query(d, root, *(c.byref(item) for item in (root_out, child_out, rx, ry, wx, wy, mask)))
        assert (rx.value, ry.value) == (64, 27) and mask.value & 256
        assert packet(control, {"type": "button", "button": "left", "down": False})["ok"]
        assert packet(control, {"type": "wheel", "dx": -1, "dy": 1})["ok"]
        assert packet(control, {"type": "key", "key": ord("a"), "down": True})["ok"]
        mapbuf = (c.c_ubyte * 32)()
        bind("XQueryKeymap", I, D, D)(d, c.cast(mapbuf, D))
        keycode = bind("XKeysymToKeycode", c.c_ubyte, D, U)(d, ord("a"))
        assert mapbuf[keycode // 8] & (1 << (keycode % 8))
        assert packet(control, {"type": "key", "key": ord("a"), "down": False})["ok"]

        fixture_text = "你好 Å"
        assert packet(control, {"type": "text", "text": fixture_text})["ok"]
        intern = bind("XInternAtom", U, D, c.c_char_p, I)
        clipboard, utf8, prop = (intern(d, term, 0) for term in (b"CLIPBOARD", b"UTF8_STRING", b"DOT_QA_TEXT"))
        assert bind("XGetSelectionOwner", U, D, U)(d, clipboard)
        window = bind("XCreateSimpleWindow", U, D, U, I, I, c.c_uint, c.c_uint, c.c_uint, U, U)(d, root, 0, 0, 1, 1, 0, 0, 0)
        bind("XConvertSelection", I, D, U, U, U, U, U)(d, clipboard, utf8, prop, window, 0)
        bind("XFlush", I, D)(d)
        ready = bind("XConnectionNumber", I, D)(d)
        assert select.select([ready], [], [], 4)[0], "X11 clipboard response timed out"
        event = (c.c_long * 24)()
        bind("XNextEvent", I, D, D)(d, c.cast(event, D))
        actual, format_value, count, remaining, data = U(), I(), U(), U(), D()
        query_prop = bind("XGetWindowProperty", I, D, U, U, c.c_long, c.c_long, I, U,
                          c.POINTER(U), c.POINTER(I), c.POINTER(U), c.POINTER(U), c.POINTER(D))
        assert query_prop(d, window, prop, 0, 2048, 0, utf8, *(c.byref(i) for i in (actual, format_value, count, remaining, data))) == 0
        assert actual.value == utf8 and format_value.value == 8
        assert c.string_at(data, count.value).decode() == fixture_text
        bind("XFree", I, D)(data)
        print("Frame 1024x720, visible pixel change, pointer and keys, UTF-8 clipboard")
    finally:
        finish(control)
        finish(server)
