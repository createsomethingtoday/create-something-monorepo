-- CREATE SOMETHING Terminal
-- Weniger, aber besser.

local wezterm = require("wezterm")
local config = wezterm.config_builder()

-- Typography (canonical: 16-20px body, 1.5-1.6 line-height)
config.font = wezterm.font("JetBrains Mono", { weight = "Regular" })
config.font_size = 15.0
config.line_height = 1.5

-- Colors: Pure black, pure white, functional accents
config.colors = {
	foreground = "#ffffff",
	background = "#000000",
	cursor_bg = "#ffffff",
	cursor_fg = "#000000",
	cursor_border = "#ffffff",
	selection_fg = "#000000",
	selection_bg = "#ffffff",

	-- Functional accents only, muted for dwelling
	ansi = {
		"#000000", -- black
		"#cc4444", -- red (error) - muted
		"#44aa44", -- green (success) - muted
		"#aa8844", -- yellow (warning) - muted
		"#4477aa", -- blue - muted
		"#8855aa", -- magenta - muted
		"#44aaaa", -- cyan - muted
		"#ffffff", -- white
	},
	brights = {
		"#666666", -- bright black (comments)
		"#dd6666", -- bright red
		"#66cc66", -- bright green
		"#ccaa66", -- bright yellow
		"#6699cc", -- bright blue
		"#aa77cc", -- bright magenta
		"#66cccc", -- bright cyan
		"#ffffff", -- bright white
	},
}

-- Window: No decoration
config.window_decorations = "RESIZE"
-- Golden ratio: --space-md = 1.618rem ≈ 26px
config.window_padding = {
	left = 26,
	right = 26,
	top = 26,
	bottom = 26,
}
config.enable_tab_bar = true
config.use_fancy_tab_bar = false
config.tab_bar_at_bottom = true
config.hide_tab_bar_if_only_one_tab = true
config.window_close_confirmation = "NeverPrompt"

-- Tab bar colors
config.colors.tab_bar = {
	background = "#000000",
	active_tab = {
		bg_color = "#000000",
		fg_color = "#ffffff",
	},
	inactive_tab = {
		bg_color = "#000000",
		fg_color = "#666666",
	},
	inactive_tab_hover = {
		bg_color = "#111111",
		fg_color = "#ffffff",
	},
	new_tab = {
		bg_color = "#000000",
		fg_color = "#666666",
	},
}

-- Tab title: auto-name from directory, allow manual override
wezterm.on("format-tab-title", function(tab)
	if tab.tab_title and #tab.tab_title > 0 then
		return " " .. tab.tab_title .. " "
	end
	local pane = tab.active_pane
	local cwd = pane.current_working_dir
	if cwd then
		return " " .. (cwd.file_path:match("([^/]+)$") or "~") .. " "
	end
	return " " .. pane.title .. " "
end)

-- Cursor: steady, no blink
config.default_cursor_style = "SteadyBar"

-- Performance
config.front_end = "WebGpu"
config.max_fps = 120
config.animation_fps = 1
config.scrollback_lines = 10000

-- Subtractive
config.audible_bell = "Disabled"

-- Hyperlinks: tool disappears
config.hyperlink_rules = wezterm.default_hyperlink_rules()

-- Keys: Pane management
config.keys = {
	-- Split panes
	{ key = "d", mods = "CMD", action = wezterm.action.SplitHorizontal({ domain = "CurrentPaneDomain" }) },
	{ key = "d", mods = "CMD|SHIFT", action = wezterm.action.SplitVertical({ domain = "CurrentPaneDomain" }) },

	-- Navigate panes (vim-style with Cmd+Shift)
	{ key = "h", mods = "CMD|SHIFT", action = wezterm.action.ActivatePaneDirection("Left") },
	{ key = "j", mods = "CMD|SHIFT", action = wezterm.action.ActivatePaneDirection("Down") },
	{ key = "k", mods = "CMD|SHIFT", action = wezterm.action.ActivatePaneDirection("Up") },
	{ key = "l", mods = "CMD|SHIFT", action = wezterm.action.ActivatePaneDirection("Right") },

	-- Close pane
	{ key = "w", mods = "CMD", action = wezterm.action.CloseCurrentPane({ confirm = false }) },

	-- Clear screen
	{ key = "k", mods = "CMD", action = wezterm.action.ClearScrollback("ScrollbackAndViewport") },

	-- Quick select (grab paths, hashes, URLs)
	{ key = "Space", mods = "CMD|SHIFT", action = wezterm.action.QuickSelect },

	-- Tab management
	{ key = "t", mods = "CMD", action = wezterm.action.SpawnTab("CurrentPaneDomain") },
	{
		key = "e",
		mods = "CMD|SHIFT",
		action = wezterm.action.PromptInputLine({
			description = "Tab name:",
			action = wezterm.action_callback(function(window, pane, line)
				if line then
					window:active_tab():set_title(line)
				end
			end),
		}),
	},
}

return config
