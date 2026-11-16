extends ColorRect
## Moves left and right with A and D. Movement maths stays here; scoring lives in score.gd.

const SPEED := 360.0
const Score := preload("res://scripts/score.gd")

var score := Score.new()

func _process(delta: float) -> void:
	var dir := Input.get_axis("move_left", "move_right")
	position.x = clampf(position.x + dir * SPEED * delta, 0.0, 960.0 - size.x)
	if dir != 0.0:
		score.add_distance(absf(dir * SPEED * delta))
	get_node("../ScoreLabel").text = "Score: %d" % score.points
