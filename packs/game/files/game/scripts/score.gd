extends RefCounted
## Pure scoring logic: no nodes, so it can be tested headless. One point per full 100 pixels travelled.

var points: int = 0
var _carry: float = 0.0

func add_distance(pixels: float) -> void:
	assert(pixels >= 0.0, "distance cannot be negative")
	_carry += pixels
	var whole := int(_carry / 100.0)
	points += whole
	_carry -= whole * 100.0
