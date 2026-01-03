-- Keybindings for WezTerm
--
-- Grammar: Consistent with neomutt, neovim, and other vim-native tools.
-- Leader: Ctrl (terminal standard, distinct from vim's leader)
--
-- Canon: The tool recedes; navigation becomes instinct.

local wezterm = require('wezterm')
local act = wezterm.action

-- Modifier key (Cmd on macOS, Ctrl elsewhere)
local mod = 'CMD'
if wezterm.target_triple:find('linux') or wezterm.target_triple:find('windows') then
	mod = 'CTRL'
end

local keys = {
	-- ─────────────────────────────────────────────────────────────────────────
	-- Pane Navigation (vim grammar: h/j/k/l)
	-- ─────────────────────────────────────────────────────────────────────────
	{ key = 'h', mods = mod, action = act.ActivatePaneDirection('Left') },
	{ key = 'j', mods = mod, action = act.ActivatePaneDirection('Down') },
	{ key = 'k', mods = mod, action = act.ActivatePaneDirection('Up') },
	{ key = 'l', mods = mod, action = act.ActivatePaneDirection('Right') },

	-- ─────────────────────────────────────────────────────────────────────────
	-- Pane Splitting (| for vertical, - for horizontal)
	-- ─────────────────────────────────────────────────────────────────────────
	{ key = '|', mods = mod .. '|SHIFT', action = act.SplitHorizontal({ domain = 'CurrentPaneDomain' }) },
	{ key = '-', mods = mod, action = act.SplitVertical({ domain = 'CurrentPaneDomain' }) },
	{ key = 'w', mods = mod, action = act.CloseCurrentPane({ confirm = true }) },

	-- ─────────────────────────────────────────────────────────────────────────
	-- Pane Resizing (Shift + vim keys)
	-- ─────────────────────────────────────────────────────────────────────────
	{ key = 'H', mods = mod .. '|SHIFT', action = act.AdjustPaneSize({ 'Left', 5 }) },
	{ key = 'J', mods = mod .. '|SHIFT', action = act.AdjustPaneSize({ 'Down', 5 }) },
	{ key = 'K', mods = mod .. '|SHIFT', action = act.AdjustPaneSize({ 'Up', 5 }) },
	{ key = 'L', mods = mod .. '|SHIFT', action = act.AdjustPaneSize({ 'Right', 5 }) },

	-- ─────────────────────────────────────────────────────────────────────────
	-- Tab Management
	-- ─────────────────────────────────────────────────────────────────────────
	{ key = 't', mods = mod, action = act.SpawnTab('CurrentPaneDomain') },
	{ key = '[', mods = mod, action = act.ActivateTabRelative(-1) },
	{ key = ']', mods = mod, action = act.ActivateTabRelative(1) },
	{ key = '1', mods = mod, action = act.ActivateTab(0) },
	{ key = '2', mods = mod, action = act.ActivateTab(1) },
	{ key = '3', mods = mod, action = act.ActivateTab(2) },
	{ key = '4', mods = mod, action = act.ActivateTab(3) },
	{ key = '5', mods = mod, action = act.ActivateTab(4) },
	{ key = '6', mods = mod, action = act.ActivateTab(5) },
	{ key = '7', mods = mod, action = act.ActivateTab(6) },
	{ key = '8', mods = mod, action = act.ActivateTab(7) },
	{ key = '9', mods = mod, action = act.ActivateTab(-1) }, -- Last tab

	-- ─────────────────────────────────────────────────────────────────────────
	-- Copy Mode (vim-style)
	-- ─────────────────────────────────────────────────────────────────────────
	{ key = 'v', mods = mod, action = act.ActivateCopyMode },

	-- ─────────────────────────────────────────────────────────────────────────
	-- Scrolling (half-page like vim)
	-- ─────────────────────────────────────────────────────────────────────────
	{ key = 'd', mods = 'CTRL', action = act.ScrollByPage(0.5) },
	{ key = 'u', mods = 'CTRL', action = act.ScrollByPage(-0.5) },

	-- ─────────────────────────────────────────────────────────────────────────
	-- Search
	-- ─────────────────────────────────────────────────────────────────────────
	{ key = '/', mods = mod, action = act.Search({ CaseInSensitiveString = '' }) },

	-- ─────────────────────────────────────────────────────────────────────────
	-- Font Size
	-- ─────────────────────────────────────────────────────────────────────────
	{ key = '=', mods = mod, action = act.IncreaseFontSize },
	{ key = '-', mods = mod .. '|SHIFT', action = act.DecreaseFontSize },
	{ key = '0', mods = mod, action = act.ResetFontSize },

	-- ─────────────────────────────────────────────────────────────────────────
	-- Clipboard (explicit bindings for Paste app compatibility)
	-- ─────────────────────────────────────────────────────────────────────────
	{ key = 'c', mods = mod, action = act.CopyTo('Clipboard') },
	{ key = 'v', mods = mod, action = act.PasteFrom('Clipboard') },
	-- Cmd+Shift+V: Let Paste app handle this (passthrough to system)
	{ key = 'V', mods = mod .. '|SHIFT', action = act.DisableDefaultAssignment },

	-- ─────────────────────────────────────────────────────────────────────────
	-- Shift+Enter: Send regular Enter (newline)
	-- ─────────────────────────────────────────────────────────────────────────
	{ key = 'Return', mods = 'SHIFT', action = act.SendString('\r') },

	-- ─────────────────────────────────────────────────────────────────────────
	-- Quick Actions
	-- ─────────────────────────────────────────────────────────────────────────
	{ key = 'p', mods = mod, action = act.ActivateCommandPalette },
	{ key = 'r', mods = mod .. '|SHIFT', action = act.ReloadConfiguration },
	{ key = 'f', mods = mod, action = act.ToggleFullScreen },
	{ key = 'z', mods = mod, action = act.TogglePaneZoomState },
}

-- Copy mode keybindings (vim grammar)
local copy_mode = {
	{ key = 'Escape', mods = 'NONE', action = act.CopyMode('Close') },
	{ key = 'q', mods = 'NONE', action = act.CopyMode('Close') },
	{ key = 'h', mods = 'NONE', action = act.CopyMode('MoveLeft') },
	{ key = 'j', mods = 'NONE', action = act.CopyMode('MoveDown') },
	{ key = 'k', mods = 'NONE', action = act.CopyMode('MoveUp') },
	{ key = 'l', mods = 'NONE', action = act.CopyMode('MoveRight') },
	{ key = 'w', mods = 'NONE', action = act.CopyMode('MoveForwardWord') },
	{ key = 'b', mods = 'NONE', action = act.CopyMode('MoveBackwardWord') },
	{ key = '0', mods = 'NONE', action = act.CopyMode('MoveToStartOfLine') },
	{ key = '$', mods = 'SHIFT', action = act.CopyMode('MoveToEndOfLineContent') },
	{ key = 'g', mods = 'NONE', action = act.CopyMode('MoveToScrollbackTop') },
	{ key = 'G', mods = 'SHIFT', action = act.CopyMode('MoveToScrollbackBottom') },
	{ key = 'v', mods = 'NONE', action = act.CopyMode({ SetSelectionMode = 'Cell' }) },
	{ key = 'V', mods = 'SHIFT', action = act.CopyMode({ SetSelectionMode = 'Line' }) },
	{
		key = 'y',
		mods = 'NONE',
		action = act.Multiple({
			act.CopyTo('ClipboardAndPrimarySelection'),
			act.CopyMode('Close'),
		}),
	},
	{ key = '/', mods = 'NONE', action = act.Search({ CaseInSensitiveString = '' }) },
	{ key = 'n', mods = 'NONE', action = act.CopyMode('NextMatch') },
	{ key = 'N', mods = 'SHIFT', action = act.CopyMode('PriorMatch') },
}

return {
	keys = keys,
	copy_mode = copy_mode,
}
