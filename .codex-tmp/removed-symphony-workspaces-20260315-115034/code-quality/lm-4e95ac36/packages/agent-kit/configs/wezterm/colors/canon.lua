-- Canon Color Palette for WezTerm
--
-- Philosophy: The terminal recedes into use. Pure black background,
-- white foreground with opacity hierarchy. No decoration.
--
-- Canon: Weniger, aber besser.

return {
	-- Background hierarchy
	background = '#000000', -- Pure black (--color-bg-pure)
	cursor_bg = '#ffffff',
	cursor_fg = '#000000',
	cursor_border = '#ffffff',
	selection_bg = 'rgba(255, 255, 255, 0.2)',
	selection_fg = 'none',

	-- Foreground hierarchy (opacity-based)
	foreground = '#ffffff', -- Primary (--color-fg-primary)
	ansi = {
		'#000000', -- black (bg)
		'#cc4444', -- red (--color-error)
		'#44aa44', -- green (--color-success)
		'#aa8844', -- yellow (--color-warning)
		'#4477aa', -- blue (--color-info)
		'#c084fc', -- magenta (--color-data-3)
		'#22c55e', -- cyan (--color-data-2)
		'#cccccc', -- white (--color-fg-secondary ~80%)
	},
	brights = {
		'#666666', -- bright black (--color-fg-muted ~40%)
		'#ff6666', -- bright red
		'#66cc66', -- bright green
		'#ccaa66', -- bright yellow
		'#6699cc', -- bright blue
		'#d8b4fe', -- bright magenta
		'#4ade80', -- bright cyan
		'#ffffff', -- bright white (--color-fg-primary)
	},

	-- Tab bar (minimal)
	tab_bar = {
		background = '#000000',
		active_tab = {
			bg_color = '#1a1a1a', -- --color-bg-subtle
			fg_color = '#ffffff',
			intensity = 'Bold',
		},
		inactive_tab = {
			bg_color = '#000000',
			fg_color = '#666666', -- --color-fg-muted
		},
		inactive_tab_hover = {
			bg_color = '#111111', -- --color-bg-surface
			fg_color = '#cccccc',
		},
		new_tab = {
			bg_color = '#000000',
			fg_color = '#666666',
		},
		new_tab_hover = {
			bg_color = '#111111',
			fg_color = '#ffffff',
		},
	},

	-- Scrollbar
	scrollbar_thumb = 'rgba(255, 255, 255, 0.1)', -- --color-border-default

	-- Split borders
	split = 'rgba(255, 255, 255, 0.1)', -- --color-border-default
}
