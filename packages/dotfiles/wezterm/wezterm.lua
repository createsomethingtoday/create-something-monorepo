-- WezTerm Configuration
--
-- CREATE SOMETHING Canon: The terminal recedes into use.
-- Pure black, fast startup, vim-native keybindings.
--
-- Philosophy: Zuhandenheit—the tool disappears when working.

local wezterm = require('wezterm')
local config = wezterm.config_builder()

-- ─────────────────────────────────────────────────────────────────────────────
-- Colors
-- ─────────────────────────────────────────────────────────────────────────────

-- Load Canon color palette
local colors = require('colors.canon')
config.colors = colors

-- ─────────────────────────────────────────────────────────────────────────────
-- Font
-- ─────────────────────────────────────────────────────────────────────────────

config.font = wezterm.font_with_fallback({
	{ family = 'JetBrains Mono', weight = 'Regular' },
	{ family = 'SF Mono', weight = 'Regular' },
	{ family = 'Menlo', weight = 'Regular' },
})
config.font_size = 14.0
config.line_height = 1.2

-- Disable ligatures for clarity
config.harfbuzz_features = { 'calt=0', 'clig=0', 'liga=0' }

-- ─────────────────────────────────────────────────────────────────────────────
-- Window
-- ─────────────────────────────────────────────────────────────────────────────

-- Minimal chrome
config.window_decorations = 'RESIZE'
config.hide_tab_bar_if_only_one_tab = true
config.tab_bar_at_bottom = true
config.use_fancy_tab_bar = false

-- Padding (subtle breathing room)
config.window_padding = {
	left = 8,
	right = 8,
	top = 8,
	bottom = 8,
}

-- Performance
config.max_fps = 120
config.animation_fps = 60

-- ─────────────────────────────────────────────────────────────────────────────
-- Cursor
-- ─────────────────────────────────────────────────────────────────────────────

config.default_cursor_style = 'SteadyBlock'
config.cursor_blink_rate = 0 -- No blinking

-- ─────────────────────────────────────────────────────────────────────────────
-- Scrolling
-- ─────────────────────────────────────────────────────────────────────────────

config.scrollback_lines = 10000
config.enable_scroll_bar = false

-- ─────────────────────────────────────────────────────────────────────────────
-- Keybindings
-- ─────────────────────────────────────────────────────────────────────────────

local keys_config = require('keys')
config.keys = keys_config.keys
config.key_tables = {
	copy_mode = keys_config.copy_mode,
}

-- NOTE: No WezTerm leader key—tmux owns Ctrl-a prefix
-- This avoids conflicts in Gastown multi-agent sessions

-- ─────────────────────────────────────────────────────────────────────────────
-- tmux Integration (Gastown)
-- ─────────────────────────────────────────────────────────────────────────────

-- CSI u mode disabled: causes [13;2u garbage when zsh doesn't handle sequences
-- Trade-off: Shift+Enter becomes regular Enter, but clipboard/Paste app works
config.enable_csi_u_key_encoding = false

-- Ensure proper key handling for tmux
config.send_composed_key_when_left_alt_is_pressed = false
config.send_composed_key_when_right_alt_is_pressed = false

-- ─────────────────────────────────────────────────────────────────────────────
-- Shell
-- ─────────────────────────────────────────────────────────────────────────────

-- Use login shell to ensure environment is loaded
config.default_prog = { '/bin/zsh', '-l' }

-- ─────────────────────────────────────────────────────────────────────────────
-- Miscellaneous
-- ─────────────────────────────────────────────────────────────────────────────

-- No audible bell
config.audible_bell = 'Disabled'
config.visual_bell = {
	fade_in_duration_ms = 0,
	fade_out_duration_ms = 0,
}

-- Don't prompt on close if process is shell
config.window_close_confirmation = 'NeverPrompt'

-- Hyperlink detection
config.hyperlink_rules = wezterm.default_hyperlink_rules()

-- GPU acceleration
config.front_end = 'WebGpu'
config.webgpu_power_preference = 'HighPerformance'

-- ─────────────────────────────────────────────────────────────────────────────
-- Status Line (optional: uncomment for session info)
-- ─────────────────────────────────────────────────────────────────────────────

-- wezterm.on('update-right-status', function(window, pane)
-- 	local date = wezterm.strftime('%H:%M')
-- 	window:set_right_status(wezterm.format({
-- 		{ Foreground = { Color = '#666666' } },
-- 		{ Text = date },
-- 	}))
-- end)

return config
