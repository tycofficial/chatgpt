"""Trusted X11 capture/input helper, on one provider-owned virtual display."""

import base64
import ctypes as c
import json
import select
import struct
import sys
import zlib

x = c.CDLL("libX11.so.6")
xt = c.CDLL("libXtst.so.6")
D = c.c_void_p
U = c.c_ulong
I = c.c_int

def bind(lib, name, result, *args):
    symbol = getattr(lib, name)
    symbol.restype = result
    symbol.argtypes = args
    return symbol

class XImage(c.Structure):
    _fields_ = [
        ("width", I), ("height", I), ("xoffset", I), ("format", I), ("data", D),
        ("byte_order", I), ("bitmap_unit", I), ("bitmap_bit_order", I), ("bitmap_pad", I),
        ("depth", I), ("bytes_per_line", I), ("bits_per_pixel", I),
        ("red_mask", U), ("green_mask", U), ("blue_mask", U),
    ]

_event_prefix = [("type", I), ("serial", U), ("send_event", I), ("display", D)]

class SelectionRequest(c.Structure):
    _fields_ = _event_prefix + [(name, U) for name in ("owner", "requestor", "selection", "target", "property", "time")]

class SelectionEvent(c.Structure):
    _fields_ = _event_prefix + [(name, U) for name in ("requestor", "selection", "target", "property", "time")]

class XEvent(c.Union):
    _fields_ = [("type", I), ("request", SelectionRequest), ("selection", SelectionEvent), ("pad", c.c_long * 24)]

open_display = bind(x, "XOpenDisplay", D, c.c_char_p)
default_root = bind(x, "XDefaultRootWindow", U, D)
connection = bind(x, "XConnectionNumber", I, D)
get_image = bind(x, "XGetImage", c.POINTER(XImage), D, U, I, I, c.c_uint, c.c_uint, U, I)
destroy_image = bind(x, "XDestroyImage", I, c.POINTER(XImage))
sync = bind(x, "XSync", I, D, I)
pending = bind(x, "XPending", I, D)
next_event = bind(x, "XNextEvent", I, D, c.POINTER(XEvent))
change_property = bind(x, "XChangeProperty", I, D, U, U, U, I, I, D, I)
send_event = bind(x, "XSendEvent", I, D, U, I, c.c_long, c.POINTER(XEvent))
keycode = bind(x, "XKeysymToKeycode", c.c_ubyte, D, U)
atom = bind(x, "XInternAtom", U, D, c.c_char_p, I)
set_owner = bind(x, "XSetSelectionOwner", I, D, U, U, U)
get_owner = bind(x, "XGetSelectionOwner", U, D, U)
make_window = bind(x, "XCreateSimpleWindow", U, D, U, I, I, c.c_uint, c.c_uint, c.c_uint, U, U)
query_extension = bind(xt, "XTestQueryExtension", I, D, *([c.POINTER(I)] * 4))
move = bind(xt, "XTestFakeMotionEvent", I, D, I, I, I, U)
button = bind(xt, "XTestFakeButtonEvent", I, D, c.c_uint, I, U)
key = bind(xt, "XTestFakeKeyEvent", I, D, c.c_uint, I, U)
get_focus = bind(x, "XGetInputFocus", I, D, c.POINTER(U), c.POINTER(I))

display = open_display(None)
if not display or not query_extension(display, *(c.byref(I()) for _ in range(4))):
    raise SystemExit("X11 display or XTEST unavailable")
root = default_root(display)
clipboard_window = make_window(display, root, 0, 0, 1, 1, 0, 0, 0)
clipboard_atom, utf8_atom, targets_atom, string_atom, atom_atom = [
    atom(display, value, 0) for value in (b"CLIPBOARD", b"UTF8_STRING", b"TARGETS", b"STRING", b"ATOM")
]
clipboard_text = ""
pressed = set()
width, height = 1024, 720

def chunk(name, data):
    return struct.pack("!I", len(data)) + name + data + struct.pack("!I", zlib.crc32(name + data))

def frame_png():
    pointer = get_image(display, root, 0, 0, width, height, U(-1), 2)  # ZPixmap
    if not pointer:
        raise RuntimeError("Xvfb capture unavailable")
    try:
        image = pointer.contents
        if (image.width, image.height, image.bits_per_pixel, image.byte_order, image.red_mask,
                image.green_mask, image.blue_mask) != (width, height, 32, 0, 0xFF0000, 0xFF00, 0xFF):
            raise RuntimeError("Unsupported Xvfb image layout")
        raw = c.string_at(image.data, image.bytes_per_line * height)
        scanline = width * 3 + 1
        rgb = bytearray(scanline * height)
        for row in range(height):
            start = row * image.bytes_per_line
            bgr = raw[start:start + width * 4]
            output = row * scanline + 1
            rgb[output:output + width * 3:3] = bgr[2::4]
            rgb[output + 1:output + width * 3:3] = bgr[1::4]
            rgb[output + 2:output + width * 3:3] = bgr[0::4]
    finally:
        destroy_image(pointer)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack("!IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rgb, 3)) + chunk(b"IEND", b""))

def reply_selection(request):
    property_id = request.property or request.target
    if request.selection != clipboard_atom:
        property_id = 0
    elif request.target == targets_atom:
        symbols = (U * 3)(targets_atom, utf8_atom, string_atom)
        change_property(display, request.requestor, property_id, atom_atom, 32, 0, c.cast(symbols, D), len(symbols))
    elif request.target in (utf8_atom, string_atom):
        data = clipboard_text.encode("utf-8") if request.target == utf8_atom else clipboard_text.encode("latin-1", "replace")
        change_property(display, request.requestor, property_id, request.target, 8, 0, c.cast(c.c_char_p(data), D), len(data))
    else:
        property_id = 0
    answer = XEvent()
    answer.selection = SelectionEvent(31, 0, 1, display, request.requestor, request.selection,
                                      request.target, property_id, request.time)  # SelectionNotify
    send_event(display, request.requestor, 0, 0, c.byref(answer))
    sync(display, 0)

def paste_text(text):
    global clipboard_text
    clipboard_text = text
    set_owner(display, clipboard_atom, clipboard_window, 0)
    if get_owner(display, clipboard_atom) != clipboard_window:
        raise RuntimeError("Could not establish X11 clipboard")
    focus, revert = U(), I()
    get_focus(display, c.byref(focus), c.byref(revert))
    if not focus.value or focus.value in (1, root):  # No application has keyboard focus.
        return
    control = keycode(display, 0xFFE3)  # XK_Control_L
    other_control = keycode(display, 0xFFE4)
    letter = keycode(display, ord("v"))
    if not control or not letter:
        raise ValueError("Missing clipboard shortcut keys")
    add_control = control not in pressed and other_control not in pressed
    if add_control:
        key(display, control, 1, 0)
    key(display, letter, 1, 0)
    key(display, letter, 0, 0)
    if letter in pressed:
        key(display, letter, 1, 0)
    if add_control:
        key(display, control, 0, 0)

def input_event(event):
    kind = event["type"]
    if kind == "move":
        move(display, 0, event["x"], event["y"], 0)
    elif kind == "button":
        button(display, {"left": 1, "middle": 2, "right": 3}[event["button"]], event["down"], 0)
    elif kind == "wheel":
        for ticks, negative, positive in ((event["dx"], 6, 7), (event["dy"], 4, 5)):
            for _ in range(abs(ticks)):
                number = negative if ticks < 0 else positive
                button(display, number, 1, 0)
                button(display, number, 0, 0)
    elif kind == "key":
        code = keycode(display, event["key"])
        if not code:
            raise ValueError("Unsupported X11 keysym")
        if event["down"]:
            pressed.add(code)
        else:
            pressed.discard(code)
        key(display, code, event["down"], 0)
    elif kind == "text":
        paste_text(event["text"])
    else:
        raise ValueError("Unknown X11 input")
    sync(display, 0)

def emit(value):
    print(json.dumps(value, separators=(",", ":")), flush=True)

stdin = sys.stdin.buffer
fd = connection(display)
emit({"ready": True})
while True:
    while pending(display):
        event = XEvent()
        next_event(display, c.byref(event))
        if event.type == 30:  # SelectionRequest
            reply_selection(event.request)
    readable, _, _ = select.select([stdin, fd], [], [])
    if stdin not in readable:
        continue
    line = stdin.readline(30_000)
    if not line:
        break
    try:
        request = json.loads(line)
        if request.get("type") == "frame":
            emit({"ok": True, "png": base64.b64encode(frame_png()).decode("ascii")})
        else:
            input_event(request)
            emit({"ok": True})
    except (ValueError, KeyError):
        emit({"error": "input"})
    except Exception:
        emit({"error": "display"})
