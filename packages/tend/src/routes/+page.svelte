<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Check,
		X,
		Clock,
		Archive,
		Mail,
		MessageSquare,
		Receipt,
		Table,
		LayoutGrid,
		Columns3,
		Filter,
		ArrowUp,
		ArrowDown,
		ChevronDown,
		Search,
		CheckSquare,
		Square,
		Minus,
		Phone,
		FileText,
		Shield,
		Star,
		DollarSign,
		Image,
		Users,
		Clipboard
	} from 'lucide-svelte';

	let { data } = $props();

	// LOCAL STATE: Items we can modify client-side (demo mode)
	let localItems = $state([...data.items]);
	let localActivityLog = $state([...(data.activityLog || [])]);
	let actionsToday = $state(data.metrics?.humanActions?.today || 0);
	
	// LIVE METRICS: These increment in real-time to show automation happening
	let liveMetrics = $state({
		automationsToday: data.metrics?.automations?.today || 0,
		callsProcessed: data.metrics?.automations?.callsProcessed || 0,
		confirmationsSent: data.metrics?.automations?.confirmationsSent || 0,
		eligibilityChecked: data.metrics?.automations?.eligibilityChecked || 0,
		recallsContacted: data.metrics?.automations?.recallsContacted || 0,
		agentTasks: data.metrics?.agents?.completed || 0,
	});

	// Toast notifications
	let toast: { message: string; type: 'success' | 'info' } | null = $state(null);
	let toastTimeout: ReturnType<typeof setTimeout> | null = null;

	function showToast(message: string, type: 'success' | 'info' = 'success') {
		if (toastTimeout) clearTimeout(toastTimeout);
		toast = { message, type };
		toastTimeout = setTimeout(() => { toast = null; }, 2500);
	}

	// ITEM ACTIONS: Update local state (demo mode - no API calls)
	function itemAction(itemId: string, action: 'approve' | 'dismiss' | 'snooze') {
		const item = localItems.find(i => i.id === itemId);
		if (!item) return;

		const statusMap = { approve: 'approved', dismiss: 'dismissed', snooze: 'snoozed' };
		const newStatus = statusMap[action];
		
		// Update item status
		localItems = localItems.map(i => 
			i.id === itemId ? { ...i, status: newStatus } : i
		);

		// Add to activity log
		const actionText = action === 'approve' ? 'Completed' 
			: action === 'dismiss' ? 'Skipped' 
			: 'Snoozed';
		localActivityLog = [
			{ minutesAgo: 0, text: `${actionText}: ${item.title}` },
			...localActivityLog.slice(0, 19)
		];

		// Increment actions counter
		actionsToday++;

		// Show toast
		showToast(`${actionText}: ${item.title.slice(0, 30)}${item.title.length > 30 ? '...' : ''}`);
		
		// Clear from selection
		selectedIds = new Set([...selectedIds].filter(id => id !== itemId));
	}

	// View state
	let viewMode: 'table' | 'cards' | 'kanban' = $state('table');
	let selectedIds: Set<string> = $state(new Set());
	let expandedId: string | null = $state(null);
	let focusedIndex: number = $state(0); // For keyboard navigation
	let showKeyboardHelp = $state(false);

	// Activity feed state (collapsed by default - calm)
	let showActivity = $state(false);

	// KEYBOARD NAVIGATION
	function handleKeydown(e: KeyboardEvent) {
		// Don't capture if typing in input
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
		
		const items = filteredItems;
		if (items.length === 0) return;
		
		// Ensure focusedIndex is valid
		if (focusedIndex >= items.length) focusedIndex = items.length - 1;
		if (focusedIndex < 0) focusedIndex = 0;
		
		const currentItem = items[focusedIndex];
		
		switch (e.key) {
			case 'j':
			case 'ArrowDown':
				e.preventDefault();
				focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
				break;
			case 'k':
			case 'ArrowUp':
				e.preventDefault();
				focusedIndex = Math.max(focusedIndex - 1, 0);
				break;
			case 'Enter':
			case 'a':
				if (currentItem && !e.metaKey && !e.ctrlKey) {
					e.preventDefault();
					itemAction(currentItem.id, 'approve');
					// Move to next item after action
					if (focusedIndex < items.length - 1) focusedIndex++;
				}
				break;
			case 'd':
				if (currentItem) {
					e.preventDefault();
					itemAction(currentItem.id, 'dismiss');
					if (focusedIndex < items.length - 1) focusedIndex++;
				}
				break;
			case 's':
				if (currentItem) {
					e.preventDefault();
					itemAction(currentItem.id, 'snooze');
				}
				break;
			case 'x':
				if (currentItem) {
					e.preventDefault();
					toggleSelect(currentItem.id);
				}
				break;
			case 'o':
			case ' ':
				if (currentItem) {
					e.preventDefault();
					expandedId = expandedId === currentItem.id ? null : currentItem.id;
				}
				break;
			case 'Escape':
				expandedId = null;
				showKeyboardHelp = false;
				break;
			case '?':
				e.preventDefault();
				showKeyboardHelp = !showKeyboardHelp;
				break;
		}
	}

	// LIVE UPDATES: Periodically add new activity (simulates real-time)
	let liveInterval: ReturnType<typeof setInterval> | null = null;
	
	onMount(() => {
		// Keyboard navigation
		window.addEventListener('keydown', handleKeydown);
		
		// Add a new activity every 8-15 seconds to feel alive
		liveInterval = setInterval(() => {
			// Activities with associated metric increments
			const activityTypes = [
				{ text: 'Verified insurance for upcoming patient', metric: 'eligibilityChecked' },
				{ text: 'Sent confirmation reminder', metric: 'confirmationsSent' },
				{ text: 'Processed incoming call', metric: 'callsProcessed' },
				{ text: 'Synced records from PMS', metric: null },
				{ text: 'Agent completed task', metric: 'agentTasks' },
				{ text: 'Eligibility check passed', metric: 'eligibilityChecked' },
				{ text: 'Recall text delivered', metric: 'recallsContacted' },
				{ text: 'Voicemail transcribed', metric: 'callsProcessed' },
				{ text: 'Sent appointment reminder', metric: 'confirmationsSent' },
				{ text: 'Agent drafted response', metric: 'agentTasks' },
			];
			
			const activity = activityTypes[Math.floor(Math.random() * activityTypes.length)];
			
			// Update activity log
			localActivityLog = [
				{ minutesAgo: 0, text: activity.text },
				...localActivityLog.slice(0, 19).map(e => ({ ...e, minutesAgo: e.minutesAgo + 1 }))
			];
			
			// Update associated metric
			if (activity.metric) {
				liveMetrics = {
					...liveMetrics,
					[activity.metric]: liveMetrics[activity.metric as keyof typeof liveMetrics] + 1,
					automationsToday: liveMetrics.automationsToday + 1
				};
			}
		}, 8000 + Math.random() * 7000);
	});

	onDestroy(() => {
		// Only run in browser (not during SSR)
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleKeydown);
		}
		if (liveInterval) clearInterval(liveInterval);
		if (toastTimeout) clearTimeout(toastTimeout);
	});

	// Filter state
	let showFilters = $state(false);
	let searchQuery = $state('');
	let statusFilter: string[] = $state(['inbox']);
	let sourceFilter: string[] = $state([]);
	let scoreRange = $state({ min: 0, max: 100 });

	// Sort state
	let sortField: 'score' | 'sourceTimestamp' | 'title' | 'sourceType' = $state('score');
	let sortDir: 'asc' | 'desc' = $state('desc');

	// Computed: filtered and sorted items (using local state)
	let filteredItems = $derived.by(() => {
		let items = [...localItems];

		// Search
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			items = items.filter(
				(item) =>
					item.title.toLowerCase().includes(q) ||
					item.body?.toLowerCase().includes(q) ||
					item.metadata?.from?.toString().toLowerCase().includes(q)
			);
		}

		// Status filter
		if (statusFilter.length > 0) {
			items = items.filter((item) => statusFilter.includes(item.status));
		}

		// Source filter
		if (sourceFilter.length > 0) {
			items = items.filter((item) => sourceFilter.includes(item.sourceType));
		}

		// Score filter
		items = items.filter((item) => {
			const score = item.score * 100;
			return score >= scoreRange.min && score <= scoreRange.max;
		});

		// Sort
		items.sort((a, b) => {
			let cmp = 0;
			switch (sortField) {
				case 'score':
					cmp = a.score - b.score;
					break;
				case 'sourceTimestamp':
					cmp =
						new Date(a.sourceTimestamp || a.ingestedAt).getTime() -
						new Date(b.sourceTimestamp || b.ingestedAt).getTime();
					break;
				case 'title':
					cmp = a.title.localeCompare(b.title);
					break;
				case 'sourceType':
					cmp = a.sourceType.localeCompare(b.sourceType);
					break;
			}
			return sortDir === 'desc' ? -cmp : cmp;
		});

		return items;
	});

	// Selection helpers
	let allSelected = $derived(
		filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id))
	);
	let someSelected = $derived(filteredItems.some((item) => selectedIds.has(item.id)));

	function toggleSelectAll() {
		if (allSelected) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(filteredItems.map((item) => item.id));
		}
	}

	function toggleSelect(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selectedIds = next;
	}

	// Sort helper
	function toggleSort(field: typeof sortField) {
		if (sortField === field) {
			sortDir = sortDir === 'desc' ? 'asc' : 'desc';
		} else {
			sortField = field;
			sortDir = 'desc';
		}
	}

	// Format relative time
	function formatRelativeTime(date: Date | string): string {
		const now = new Date();
		const then = new Date(date);
		const diff = now.getTime() - then.getTime();

		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 60) return `${minutes}m`;
		if (hours < 24) return `${hours}h`;
		return `${days}d`;
	}

	// Get source icon
	function getSourceIcon(sourceType: string) {
		switch (sourceType) {
			// Dental sources
			case 'pms':
				return Clipboard;
			case 'phone':
				return Phone;
			case 'insurance':
				return Shield;
			case 'claims':
				return FileText;
			case 'reviews':
				return Star;
			case 'accounting':
				return DollarSign;
			case 'imaging':
				return Image;
			case 'patient_comms':
				return Users;
			// Generic sources
			case 'gmail':
				return Mail;
			case 'slack':
				return MessageSquare;
			case 'quickbooks':
				return Receipt;
			default:
				return FileText;
		}
	}

	// Score visual
	function getScoreClass(score: number): string {
		if (score >= 0.8) return 'score-high';
		if (score >= 0.5) return 'score-medium';
		return 'score-low';
	}

	// Bulk actions
	function bulkAction(action: 'approve' | 'dismiss' | 'snooze' | 'archive') {
		const ids = Array.from(selectedIds);
		if (action === 'archive') {
			// Archive is just dismiss for demo
			ids.forEach(id => itemAction(id, 'dismiss'));
		} else {
			ids.forEach(id => itemAction(id, action));
		}
		showToast(`${ids.length} item${ids.length === 1 ? '' : 's'} updated`);
	}

	// Unique sources for filter
	let availableSources = $derived([...new Set(localItems.map((item) => item.sourceType))]);

	// Search highlighting helper
	function highlightSearch(text: string): string {
		if (!searchQuery || searchQuery.length < 2) return text;
		const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
		return text.replace(regex, '<mark>$1</mark>');
	}
</script>

<svelte:head>
	<title>Database | TEND</title>
</svelte:head>

<div class="database-page">
	<!-- Activity Feed (expandable) -->
	{#if data.metrics}
		<div class="activity-bar" class:expanded={showActivity}>
			<button class="activity-toggle" onclick={() => showActivity = !showActivity}>
				<span class="activity-pulse"></span>
				<span class="activity-summary">
					{#if showActivity}
						Activity
					{:else}
						{liveMetrics.automationsToday} automations today · {data.metrics.agents.awaitingApproval} need review
					{/if}
				</span>
				<ChevronDown size={14} class="activity-chevron" />
			</button>
			
			{#if showActivity}
				<div class="activity-feed">
					<!-- Right Now: Tufte-style inline metrics, no boxes -->
					<div class="activity-section section-status">
						<h4 class="activity-section-title">Right now</h4>
						<div class="status-line">
							<span class="status-metric good"><strong>{data.metrics.health.waitingRoom}</strong> waiting</span>
							<span class="status-sep">·</span>
							<span class="status-metric good"><strong>{data.metrics.today.avgWaitTime}</strong> avg wait</span>
							<span class="status-sep">·</span>
							<span class="status-metric good"><strong>{data.metrics.today.onTimeRate}%</strong> on time</span>
							<span class="status-sep">·</span>
							<span class="status-metric"><strong>{data.metrics.health.noShowRate}%</strong> no-shows</span>
						</div>
					</div>
					
					<!-- Today: Two-column layout with φ ratio -->
					<div class="activity-section section-today">
						<h4 class="activity-section-title">Today</h4>
						<div class="today-grid">
							<div class="today-primary">
								<div class="today-hero">
									<span class="today-big">{data.metrics.today.completed}</span>
									<span class="today-of">of {data.metrics.today.appointments}</span>
								</div>
								<span class="today-label">patients seen</span>
							</div>
							<div class="today-secondary">
								<div class="stat-row"><span class="stat-value">{liveMetrics.automationsToday}</span> handled automatically</div>
								<div class="stat-row indent"><span class="stat-value">{liveMetrics.callsProcessed}</span> calls</div>
								<div class="stat-row indent"><span class="stat-value">{liveMetrics.confirmationsSent}</span> confirmations</div>
								<div class="stat-row indent"><span class="stat-value">{liveMetrics.eligibilityChecked}</span> eligibility checks</div>
								<div class="stat-row indent"><span class="stat-value">{liveMetrics.recallsContacted}</span> recalls</div>
								<div class="stat-row"><span class="stat-value">{liveMetrics.agentTasks}</span> agent tasks</div>
								<div class="stat-row"><span class="stat-value">{actionsToday}</span> your decisions</div>
							</div>
						</div>
					</div>

					<!-- Just Happened: Clean log, no chrome -->
					<div class="activity-section section-log">
						<h4 class="activity-section-title">Just happened</h4>
						<div class="activity-log">
							{#if localActivityLog && localActivityLog.length > 0}
								{#each localActivityLog.slice(0, 8) as entry}
									<div class="log-item"><span class="log-time">{entry.minutesAgo}m</span> {entry.text}</div>
								{/each}
							{:else}
								<div class="log-item"><span class="log-time">-</span> No recent activity</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Toolbar -->
	<header class="toolbar">
		<div class="toolbar-left">
			<h1 class="page-title">Database</h1>
			<span class="record-count">{filteredItems.length} records</span>
		</div>

		<div class="toolbar-center">
			<div class="search-box">
				<Search size={14} />
				<input type="text" placeholder="Search..." bind:value={searchQuery} />
			</div>
		</div>

		<div class="toolbar-right">
			<button
				class="toolbar-btn"
				class:active={showFilters}
				onclick={() => (showFilters = !showFilters)}
			>
				<Filter size={14} />
				<span>Filter</span>
			</button>

			<div class="view-switcher">
				<button
					class="view-btn"
					class:active={viewMode === 'table'}
					onclick={() => (viewMode = 'table')}
					title="Table view"
				>
					<Table size={14} />
				</button>
				<button
					class="view-btn"
					class:active={viewMode === 'cards'}
					onclick={() => (viewMode = 'cards')}
					title="Card view"
				>
					<LayoutGrid size={14} />
				</button>
				<button
					class="view-btn"
					class:active={viewMode === 'kanban'}
					onclick={() => (viewMode = 'kanban')}
					title="Kanban view"
				>
					<Columns3 size={14} />
				</button>
			</div>
			
			<!-- Keyboard hint in toolbar -->
			<button class="keyboard-hint" onclick={() => showKeyboardHelp = true}>
				<kbd>?</kbd> shortcuts
			</button>
		</div>
	</header>

	<!-- Filter Panel -->
	{#if showFilters}
		<div class="filter-panel">
			<div class="filter-group">
				<label class="filter-label">Status</label>
				<div class="filter-options">
					{#each ['inbox', 'approved', 'dismissed', 'snoozed', 'archived'] as status}
						<label class="filter-chip" class:active={statusFilter.includes(status)}>
							<input
								type="checkbox"
								checked={statusFilter.includes(status)}
								onchange={() => {
									if (statusFilter.includes(status)) {
										statusFilter = statusFilter.filter((s) => s !== status);
									} else {
										statusFilter = [...statusFilter, status];
									}
								}}
							/>
							<span>{status}</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="filter-group">
				<label class="filter-label">Source</label>
				<div class="filter-options">
					{#each availableSources as source}
						<label class="filter-chip" class:active={sourceFilter.includes(source)}>
							<input
								type="checkbox"
								checked={sourceFilter.includes(source)}
								onchange={() => {
									if (sourceFilter.includes(source)) {
										sourceFilter = sourceFilter.filter((s) => s !== source);
									} else {
										sourceFilter = [...sourceFilter, source];
									}
								}}
							/>
							<span>{source}</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="filter-group">
				<label class="filter-label">Score Range</label>
				<div class="score-range">
					<input
						type="number"
						min="0"
						max="100"
						bind:value={scoreRange.min}
						class="range-input"
					/>
					<span class="range-sep">–</span>
					<input
						type="number"
						min="0"
						max="100"
						bind:value={scoreRange.max}
						class="range-input"
					/>
				</div>
			</div>
		</div>
	{/if}

	<!-- Bulk Actions Bar -->
	{#if selectedIds.size > 0}
		<div class="bulk-bar">
			<span class="bulk-count">{selectedIds.size} item{selectedIds.size === 1 ? '' : 's'}</span>
			<div class="bulk-actions">
				<button class="bulk-btn approve" onclick={() => bulkAction('approve')}>
					<Check size={14} />
					<span>Done</span>
				</button>
				<button class="bulk-btn dismiss" onclick={() => bulkAction('dismiss')}>
					<X size={14} />
					<span>Skip</span>
				</button>
				<button class="bulk-btn snooze" onclick={() => bulkAction('snooze')}>
					<Clock size={14} />
					<span>Later</span>
				</button>
				<button class="bulk-btn archive" onclick={() => bulkAction('archive')}>
					<Archive size={14} />
					<span>Archive</span>
				</button>
			</div>
			<button class="bulk-clear" onclick={() => (selectedIds = new Set())}>Never mind</button>
		</div>
	{/if}

	<!-- Table View -->
	{#if viewMode === 'table'}
		<div class="table-container">
			<table class="data-table">
				<thead>
					<tr>
						<th class="col-select">
							<button class="select-all" onclick={toggleSelectAll}>
								{#if allSelected}
									<CheckSquare size={16} />
								{:else if someSelected}
									<Minus size={16} />
								{:else}
									<Square size={16} />
								{/if}
							</button>
						</th>
						<th class="col-source">
							<button class="sort-header" onclick={() => toggleSort('sourceType')}>
								Source
								{#if sortField === 'sourceType'}
									{#if sortDir === 'desc'}<ArrowDown size={12} />{:else}<ArrowUp size={12} />{/if}
								{/if}
							</button>
						</th>
						<th class="col-title">
							<button class="sort-header" onclick={() => toggleSort('title')}>
								Title
								{#if sortField === 'title'}
									{#if sortDir === 'desc'}<ArrowDown size={12} />{:else}<ArrowUp size={12} />{/if}
								{/if}
							</button>
						</th>
						<th class="col-meta">From</th>
						<th class="col-time">
							<button class="sort-header" onclick={() => toggleSort('sourceTimestamp')}>
								Time
								{#if sortField === 'sourceTimestamp'}
									{#if sortDir === 'desc'}<ArrowDown size={12} />{:else}<ArrowUp size={12} />{/if}
								{/if}
							</button>
						</th>
						<th class="col-score">
							<button class="sort-header" onclick={() => toggleSort('score')}>
								Score
								{#if sortField === 'score'}
									{#if sortDir === 'desc'}<ArrowDown size={12} />{:else}<ArrowUp size={12} />{/if}
								{/if}
							</button>
						</th>
						<th class="col-actions">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredItems as item, index (item.id)}
						{@const SourceIcon = getSourceIcon(item.sourceType)}
						{@const isSelected = selectedIds.has(item.id)}
						{@const isExpanded = expandedId === item.id}
						{@const isFocused = focusedIndex === index}
						<tr class:selected={isSelected} class:expanded={isExpanded} class:focused={isFocused}>
							<td class="col-select">
								<button class="row-select" onclick={() => toggleSelect(item.id)}>
									{#if isSelected}
										<CheckSquare size={16} />
									{:else}
										<Square size={16} />
									{/if}
								</button>
							</td>
							<td class="col-source">
								<div class="source-badge">
									<SourceIcon size={12} />
									<span>{item.sourceType}</span>
								</div>
							</td>
							<td class="col-title">
							<button class="title-cell" onclick={() => (expandedId = isExpanded ? null : item.id)}>
								<span class="title-text">{@html highlightSearch(item.title)}</span>
								{#if item.body}
									<span class="expand-icon" class:rotated={isExpanded}>
										<ChevronDown size={12} />
									</span>
								{/if}
							</button>
							</td>
							<td class="col-meta">
								<span class="meta-text">
									{item.metadata?.from || item.metadata?.channel || '—'}
								</span>
							</td>
							<td class="col-time">
								<span class="time-text">
									{formatRelativeTime(item.sourceTimestamp || item.ingestedAt)}
								</span>
							</td>
							<td class="col-score">
								<div class="score-cell {getScoreClass(item.score)}">
									{Math.round(item.score * 100)}
								</div>
							</td>
							<td class="col-actions">
								<div class="row-actions">
									<button class="action-btn approve" title="Done" onclick={() => itemAction(item.id, 'approve')}>
										<Check size={14} />
									</button>
									<button class="action-btn dismiss" title="Skip" onclick={() => itemAction(item.id, 'dismiss')}>
										<X size={14} />
									</button>
									<button class="action-btn snooze" title="Later" onclick={() => itemAction(item.id, 'snooze')}>
										<Clock size={14} />
									</button>
								</div>
							</td>
						</tr>
						{#if isExpanded && item.body}
							<tr class="expanded-row">
								<td colspan="7">
									<div class="expanded-content">
										<p class="item-body">{item.body}</p>
										<div class="expanded-meta">
											<span class="meta-item">ID: {item.id}</span>
											<span class="meta-item">Source ID: {item.sourceItemId || '—'}</span>
											<span class="meta-item">Status: {item.status}</span>
										</div>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Card View -->
	{#if viewMode === 'cards'}
		<div class="cards-grid">
			{#each filteredItems as item (item.id)}
				{@const SourceIcon = getSourceIcon(item.sourceType)}
				{@const isSelected = selectedIds.has(item.id)}
				<article class="item-card" class:selected={isSelected}>
					<div class="card-header">
						<button class="card-select" onclick={() => toggleSelect(item.id)}>
							{#if isSelected}
								<CheckSquare size={14} />
							{:else}
								<Square size={14} />
							{/if}
						</button>
						<div class="source-badge">
							<SourceIcon size={12} />
							<span>{item.sourceType}</span>
						</div>
						<div class="score-cell {getScoreClass(item.score)}">
							{Math.round(item.score * 100)}
						</div>
					</div>

					<h3 class="card-title">{item.title}</h3>
					{#if item.body}
						<p class="card-body">{item.body}</p>
					{/if}

					<div class="card-meta">
						<span>{item.metadata?.from || item.metadata?.channel || ''}</span>
						<span>{formatRelativeTime(item.sourceTimestamp || item.ingestedAt)}</span>
					</div>

					<div class="card-actions">
						<button class="action-btn approve" title="Done" onclick={() => itemAction(item.id, 'approve')}>
							<Check size={14} />
						</button>
						<button class="action-btn dismiss" title="Skip" onclick={() => itemAction(item.id, 'dismiss')}>
							<X size={14} />
						</button>
						<button class="action-btn snooze" title="Later" onclick={() => itemAction(item.id, 'snooze')}>
							<Clock size={14} />
						</button>
					</div>
				</article>
			{/each}
		</div>
	{/if}

	<!-- Kanban View -->
	{#if viewMode === 'kanban'}
		<div class="kanban-board">
			{#each ['inbox', 'approved', 'dismissed', 'snoozed'] as status}
				{@const columnItems = filteredItems.filter((item) => item.status === status)}
				<div class="kanban-column">
					<div class="column-header">
						<h3 class="column-title">{status}</h3>
						<span class="column-count">{columnItems.length}</span>
					</div>
					<div class="column-items">
						{#each columnItems as item (item.id)}
							{@const SourceIcon = getSourceIcon(item.sourceType)}
							<article class="kanban-card">
								<div class="kanban-card-header">
									<div class="source-badge small">
										<SourceIcon size={10} />
									</div>
									<div class="score-cell small {getScoreClass(item.score)}">
										{Math.round(item.score * 100)}
									</div>
								</div>
								<h4 class="kanban-title">{item.title}</h4>
								<span class="kanban-time">
									{formatRelativeTime(item.sourceTimestamp || item.ingestedAt)}
								</span>
							</article>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if filteredItems.length === 0}
		<div class="empty-state">
			<p>Nothing here. Try different filters?</p>
		</div>
	{/if}

	<!-- Toast Notification -->
	{#if toast}
		<div class="toast" class:success={toast.type === 'success'}>
			<Check size={14} />
			<span>{toast.message}</span>
		</div>
	{/if}

	<!-- Keyboard Shortcuts Help -->
	{#if showKeyboardHelp}
		<div class="keyboard-help-overlay" onclick={() => showKeyboardHelp = false}>
			<div class="keyboard-help" onclick={(e) => e.stopPropagation()}>
				<h3>Keyboard shortcuts</h3>
				<div class="shortcut-grid">
					<div class="shortcut-section">
						<h4>Navigation</h4>
						<div class="shortcut"><kbd>j</kbd> <kbd>↓</kbd> <span>Next item</span></div>
						<div class="shortcut"><kbd>k</kbd> <kbd>↑</kbd> <span>Previous item</span></div>
						<div class="shortcut"><kbd>o</kbd> <kbd>space</kbd> <span>Expand/collapse</span></div>
					</div>
					<div class="shortcut-section">
						<h4>Actions</h4>
						<div class="shortcut"><kbd>a</kbd> <kbd>↵</kbd> <span>Approve (done)</span></div>
						<div class="shortcut"><kbd>d</kbd> <span>Dismiss (skip)</span></div>
						<div class="shortcut"><kbd>s</kbd> <span>Snooze (later)</span></div>
						<div class="shortcut"><kbd>x</kbd> <span>Select/deselect</span></div>
					</div>
					<div class="shortcut-section">
						<h4>General</h4>
						<div class="shortcut"><kbd>?</kbd> <span>Show this help</span></div>
						<div class="shortcut"><kbd>esc</kbd> <span>Close</span></div>
					</div>
				</div>
				<button class="close-help" onclick={() => showKeyboardHelp = false}>Got it</button>
			</div>
		</div>
	{/if}

</div>

<style>
	.database-page {
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* Activity Bar (collapsed by default - calm) */
	.activity-bar {
		background: var(--color-bg-elevated);
		border-bottom: 1px solid var(--color-border-default);
		flex-shrink: 0;
	}

	.activity-toggle {
		width: 100%;
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-md);
		border: none;
		background: transparent;
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		cursor: pointer;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.activity-toggle:hover {
		color: var(--color-fg-secondary);
	}

	.activity-pulse {
		width: 6px;
		height: 6px;
		background: var(--color-success);
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 1; }
	}

	.activity-summary {
		flex: 1;
		text-align: left;
	}

	.activity-chevron {
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.activity-bar.expanded .activity-chevron {
		transform: rotate(180deg);
	}

	/* Activity Feed - Tufte-inspired, φ-proportioned */
	.activity-feed {
		padding: var(--space-sm) var(--space-md);
		display: grid;
		/* Golden ratio: 1 : φ : φ² ≈ 1 : 1.618 : 2.618 */
		grid-template-columns: 1fr 1.618fr 2.618fr;
		gap: var(--space-lg);
		border-top: 1px solid var(--color-border-subtle);
	}

	.activity-section {
		/* No background, no border - let data breathe */
	}

	.activity-section-title {
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-xs);
	}

	/* Status Line - Tufte sparkline-adjacent style */
	.status-line {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.status-metric strong {
		font-weight: 600;
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.status-metric.good strong {
		color: var(--color-success);
	}

	.status-sep {
		color: var(--color-fg-muted);
	}

	/* Today Grid - φ proportion between hero number and detail */
	.today-grid {
		display: flex;
		gap: var(--space-md);
	}

	.today-primary {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.today-hero {
		display: flex;
		align-items: baseline;
		gap: 4px;
	}

	.today-big {
		font-size: var(--text-h1);
		font-weight: 600;
		color: var(--color-fg-primary);
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.today-of {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.today-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: 2px;
	}

	.today-secondary {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-left: var(--space-sm);
		border-left: 1px solid var(--color-border-subtle);
	}

	.stat-row {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}

	.stat-row.indent {
		padding-left: var(--space-sm);
		color: var(--color-fg-muted);
	}

	.stat-value {
		font-weight: 500;
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	/* Activity Log - Clean, no chrome */
	.activity-log {
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-height: 140px;
		overflow-y: auto;
	}

	.log-item {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.log-time {
		display: inline;
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
		margin-right: var(--space-xs);
	}

	/* Toolbar - Clean, minimal chrome */
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm) var(--space-md);
		/* Tufte: single rule to separate, not background color */
		border-bottom: 1px solid var(--color-border-default);
		flex-shrink: 0;
	}

	.toolbar-left {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
	}

	.page-title {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.record-count {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.toolbar-center {
		flex: 1;
		max-width: 400px;
		margin: 0 var(--space-lg);
	}

	.search-box {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
		color: var(--color-fg-muted);
	}

	.search-box input {
		flex: 1;
		border: none;
		background: transparent;
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		outline: none;
	}

	.search-box input::placeholder {
		color: var(--color-fg-muted);
	}

	.toolbar-right {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.toolbar-btn {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-border-default);
		background: transparent;
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-caption);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.toolbar-btn:hover,
	.toolbar-btn.active {
		background: var(--color-bg-elevated);
		color: var(--color-fg-primary);
	}

	.view-switcher {
		display: flex;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.view-btn {
		padding: var(--space-xs);
		border: none;
		background: transparent;
		color: var(--color-fg-tertiary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.view-btn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-fg-secondary);
	}

	.view-btn.active {
		background: var(--color-bg-elevated);
		color: var(--color-fg-primary);
	}

	/* Filter Panel - Tufte: no background, let filters breathe */
	.filter-panel {
		display: flex;
		gap: var(--space-lg);
		padding: var(--space-sm) var(--space-md);
		border-bottom: 1px solid var(--color-border-subtle);
		flex-shrink: 0;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.filter-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.filter-options {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}

	.filter-chip {
		display: flex;
		align-items: center;
		padding: 2px var(--space-xs);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.filter-chip input {
		display: none;
	}

	.filter-chip:hover {
		border-color: var(--color-fg-tertiary);
	}

	.filter-chip.active {
		background: var(--color-fg-primary);
		border-color: var(--color-fg-primary);
		color: var(--color-bg-base);
	}

	.score-range {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.range-input {
		width: 48px;
		padding: 2px var(--space-xs);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		font-size: var(--text-caption);
		text-align: center;
	}

	.range-sep {
		color: var(--color-fg-muted);
	}

	/* Bulk Bar */
	.bulk-bar {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-xs) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-base);
		flex-shrink: 0;
	}

	.bulk-count {
		font-size: var(--text-body-sm);
		font-weight: 500;
	}

	.bulk-actions {
		display: flex;
		gap: var(--space-xs);
	}

	.bulk-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: var(--space-xs) var(--space-sm);
		border: none;
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.bulk-btn:hover {
		opacity: 0.9;
	}

	.bulk-btn.approve {
		background: var(--color-success);
		color: white;
	}
	.bulk-btn.dismiss {
		background: var(--color-error);
		color: white;
	}
	.bulk-btn.snooze {
		background: var(--color-warning);
		color: white;
	}
	.bulk-btn.archive {
		background: var(--color-fg-tertiary);
		color: white;
	}

	.bulk-clear {
		margin-left: auto;
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid rgba(255, 255, 255, 0.3);
		background: transparent;
		border-radius: var(--radius-sm);
		color: inherit;
		font-size: var(--text-caption);
		cursor: pointer;
	}

	/* Table */
	.table-container {
		flex: 1;
		overflow: auto;
	}

	/* Table - Tufte-inspired: minimal lines, data forward */
	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-body-sm);
	}

	.data-table th {
		position: sticky;
		top: 0;
		background: var(--color-bg-surface);
		border-bottom: 1px solid var(--color-border-default);
		padding: var(--space-xs) var(--space-sm);
		text-align: left;
		font-weight: 500;
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		/* Tufte: avoid uppercase, it adds visual noise */
	}

	.data-table td {
		padding: var(--space-sm) var(--space-sm);
		/* Tufte: use whitespace, not lines, to separate rows */
		border-bottom: none;
		vertical-align: middle;
	}

	/* Subtle alternating for scanability without lines */
	.data-table tbody tr:nth-child(odd) td {
		background: var(--color-bg-elevated);
	}

	.data-table tr:hover td {
		background: var(--color-bg-subtle);
	}

	.data-table tr.selected td {
		background: var(--color-hover);
	}

	.sort-header {
		display: flex;
		align-items: center;
		gap: 4px;
		border: none;
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.sort-header:hover {
		color: var(--color-fg-primary);
	}

	.col-select {
		width: 40px;
	}
	.col-source {
		width: 100px;
	}
	.col-meta {
		width: 160px;
	}
	.col-time {
		width: 60px;
	}
	.col-score {
		width: 60px;
	}
	.col-actions {
		width: 100px;
	}

	.select-all,
	.row-select {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		background: transparent;
		color: var(--color-fg-tertiary);
		cursor: pointer;
	}

	.select-all:hover,
	.row-select:hover {
		color: var(--color-fg-primary);
	}

	/* Source - Tufte: icon + label, no box */
	.source-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.source-badge.small {
		gap: 2px;
	}

	.title-cell {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		border: none;
		background: transparent;
		color: var(--color-fg-primary);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.title-text {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 300px;
	}

	.expand-icon {
		flex-shrink: 0;
		display: flex;
		color: var(--color-fg-muted);
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.expand-icon.rotated {
		transform: rotate(180deg);
	}

	.meta-text {
		color: var(--color-fg-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.time-text {
		color: var(--color-fg-muted);
	}

	/* Score - Tufte: just the number, color conveys meaning */
	.score-cell {
		font-size: var(--text-body-sm);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.score-cell.small {
		font-size: var(--text-caption);
	}

	/* Color alone conveys priority - no background chrome */
	.score-high {
		color: var(--color-success);
	}
	.score-medium {
		color: var(--color-warning);
	}
	.score-low {
		color: var(--color-fg-muted);
	}

	.row-actions {
		display: flex;
		gap: 2px;
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	tr:hover .row-actions {
		opacity: 1;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		background: transparent;
		border-radius: var(--radius-sm);
		color: var(--color-fg-tertiary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.action-btn:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.action-btn.approve:hover {
		background: var(--color-success-muted);
		color: var(--color-success);
	}
	.action-btn.dismiss:hover {
		background: var(--color-error-muted);
		color: var(--color-error);
	}
	.action-btn.snooze:hover {
		background: var(--color-warning-muted);
		color: var(--color-warning);
	}

	/* Expanded Row */
	.expanded-row td {
		padding: 0;
		background: var(--color-bg-subtle);
	}

	.expanded-content {
		padding: var(--space-sm) var(--space-md);
		padding-left: calc(40px + var(--space-sm));
	}

	.item-body {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		margin-bottom: var(--space-sm);
		white-space: pre-wrap;
	}

	.expanded-meta {
		display: flex;
		gap: var(--space-md);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Card Grid */
	.cards-grid {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-md);
		padding: var(--space-md);
		overflow: auto;
	}

	.item-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.item-card:hover {
		border-color: var(--color-fg-tertiary);
	}

	.item-card.selected {
		border-color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.card-select {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border: none;
		background: transparent;
		color: var(--color-fg-tertiary);
		cursor: pointer;
	}

	.card-header .score-cell {
		margin-left: auto;
	}

	.card-title {
		font-size: var(--text-body);
		font-weight: 500;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-body {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-meta {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.card-actions {
		display: flex;
		gap: 4px;
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-subtle);
	}

	/* Kanban */
	.kanban-board {
		flex: 1;
		display: flex;
		gap: var(--space-md);
		padding: var(--space-md);
		overflow-x: auto;
	}

	.kanban-column {
		flex: 0 0 280px;
		display: flex;
		flex-direction: column;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.column-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm) var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.column-title {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
		text-transform: capitalize;
	}

	.column-count {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-elevated);
		padding: 2px var(--space-xs);
		border-radius: var(--radius-sm);
	}

	.column-items {
		flex: 1;
		padding: var(--space-sm);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		overflow-y: auto;
	}

	.kanban-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		cursor: grab;
	}

	.kanban-card:hover {
		border-color: var(--color-fg-tertiary);
	}

	.kanban-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-xs);
	}

	.kanban-title {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.kanban-time {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Empty State */
	.empty-state {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-fg-muted);
	}

	/* Toast Notification */
	.toast {
		position: fixed;
		bottom: var(--space-6);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		font-size: var(--text-sm);
		color: var(--color-fg-secondary);
		animation: toast-in 0.2s ease-out;
		z-index: 1000;
	}

	.toast.success {
		color: var(--color-success);
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	/* Focused Row (keyboard navigation) */
	tr.focused {
		background: var(--color-hover) !important;
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
	}

	tr.focused td {
		background: transparent !important;
	}

	/* Search Highlighting */
	:global(mark) {
		background: var(--color-warning-muted);
		color: var(--color-fg-primary);
		padding: 0 2px;
		border-radius: 2px;
	}

	/* Keyboard Help Modal */
	.keyboard-help-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		animation: fade-in 0.15s ease-out;
	}

	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.keyboard-help {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-6);
		max-width: 480px;
		width: 90%;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}

	.keyboard-help h3 {
		font-size: var(--text-lg);
		font-weight: 600;
		margin-bottom: var(--space-5);
		color: var(--color-fg-primary);
	}

	.shortcut-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: var(--space-5);
	}

	.shortcut-section h4 {
		font-size: var(--text-xs);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-3);
	}

	.shortcut {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-2);
	}

	.shortcut span {
		margin-left: auto;
		color: var(--color-fg-muted);
	}

	kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 20px;
		padding: 0 var(--space-2);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-family: inherit;
		font-size: var(--text-xs);
		color: var(--color-fg-secondary);
	}

	.close-help {
		display: block;
		width: 100%;
		margin-top: var(--space-5);
		padding: var(--space-3);
		background: var(--color-accent);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.close-help:hover {
		opacity: 0.9;
	}

	/* Keyboard Hint - in toolbar */
	.keyboard-hint {
		font-size: var(--text-xs);
		color: var(--color-fg-muted);
		opacity: 0.5;
		display: flex;
		align-items: center;
		gap: var(--space-1);
		cursor: pointer;
		transition: opacity 0.15s ease;
		background: none;
		border: none;
		padding: var(--space-1) var(--space-2);
		margin-left: var(--space-3);
	}

	.keyboard-hint:hover {
		opacity: 0.9;
	}

	.keyboard-hint kbd {
		font-size: 10px;
		min-width: 16px;
		height: 16px;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	/* ============================================
	   MOBILE RESPONSIVE STYLES
	   Tufte: Reflow, don't remove. Same data, different arrangement.
	   ============================================ */

	@media (max-width: 768px) {
		/* Toolbar: Wrap and reorder for mobile */
		.toolbar {
			flex-wrap: wrap;
			gap: var(--space-xs);
			padding: var(--space-xs) var(--space-sm);
		}

		.toolbar-left {
			width: 100%;
			order: 1;
		}

		.toolbar-center {
			width: 100%;
			max-width: none;
			margin: 0;
			order: 0; /* Search first on mobile */
		}

		.toolbar-right {
			width: 100%;
			justify-content: space-between;
			order: 2;
		}

		/* Activity Feed: Stack vertically on mobile */
		.activity-feed {
			grid-template-columns: 1fr;
			gap: var(--space-sm);
		}

		.activity-section {
			padding-bottom: var(--space-sm);
			border-bottom: 1px solid var(--color-border-subtle);
		}

		.activity-section:last-child {
			border-bottom: none;
			padding-bottom: 0;
		}

		/* Table: Transform to card layout on mobile
		   Tufte: Use whitespace, not lines. Let data breathe. */
		.data-table {
			display: block;
		}

		.data-table thead {
			display: none;
		}

		.data-table tbody {
			display: flex;
			flex-direction: column;
			gap: 0;
		}

		.data-table tbody tr {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: var(--space-xs);
			position: relative;
			padding: var(--space-md) 0;
			/* Tufte: single subtle rule, not box */
			border: none !important;
			border-bottom: 1px solid var(--color-border-subtle) !important;
			border-radius: 0 !important;
			background: transparent !important;
		}

		.data-table tbody tr:nth-child(odd) td,
		.data-table tbody tr:nth-child(even) td {
			background: transparent !important;
		}

		.data-table tbody tr:last-child {
			border-bottom: none !important;
		}

		.data-table tbody tr:hover,
		.data-table tbody tr:hover td {
			background: transparent !important;
		}

		.data-table td {
			padding: 0 !important;
			background: transparent !important;
		}

		/* Row 1: Source (left) + Select (right) */
		.col-select {
			order: 2;
			margin-left: auto;
		}

		.col-source {
			order: 1;
			font-size: var(--text-caption);
		}

		/* Row 2: Title spans full width */
		.col-title {
			order: 3;
			width: 100%;
			margin-top: var(--space-xs);
		}

		.title-text {
			max-width: none;
			white-space: normal;
			font-size: var(--text-body);
			line-height: var(--leading-relaxed);
		}

		/* Hide meta - it just shows a dash */
		.col-meta {
			display: none !important;
		}

		/* Row 3: Time · Score (left) + Actions (right) */
		.col-time {
			order: 4;
			font-size: var(--text-caption);
			color: var(--color-fg-muted);
			margin-top: var(--space-xs);
		}

		.col-score {
			order: 5;
			margin-top: var(--space-xs);
			margin-left: var(--space-sm);
		}

		.col-score::before {
			content: '·';
			margin-right: var(--space-sm);
			color: var(--color-fg-muted);
			font-weight: normal;
		}

		.col-actions {
			order: 6;
			margin-left: auto;
			margin-top: var(--space-xs);
		}

		/* Actions: inline, compact */
		.row-actions {
			opacity: 1;
			gap: var(--space-xs);
		}

		.action-btn {
			width: 40px;
			height: 40px;
			opacity: 0.6;
		}

		.action-btn:active {
			opacity: 1;
			transform: scale(0.95);
		}

		/* Filter panel: Stack on mobile */
		.filter-panel {
			flex-direction: column;
			gap: var(--space-sm);
		}

		/* Cards grid: Tufte-clean on mobile */
		.cards-grid {
			grid-template-columns: 1fr;
			padding: var(--space-sm);
			gap: 0; /* Use borders instead of gap */
		}

		.item-card {
			border-radius: 0;
			border-left: none;
			border-right: none;
			border-top: none;
			/* Single rule between cards */
			border-bottom: 1px solid var(--color-border-subtle);
			padding: var(--space-md) 0;
		}

		.item-card:last-child {
			border-bottom: none;
		}

		.item-card:hover {
			border-color: var(--color-border-subtle); /* No hover change */
		}

		.card-actions {
			border-top: none;
			padding-top: var(--space-sm);
		}

		/* Kanban: Horizontal scroll hint */
		.kanban-board {
			padding: var(--space-sm);
		}

		.kanban-column {
			flex: 0 0 85vw;
		}

		/* Keyboard help: Full width on mobile */
		.keyboard-help {
			max-width: 95%;
			padding: var(--space-md);
		}

		.shortcut-grid {
			grid-template-columns: 1fr;
		}

		/* Hide keyboard hint on touch devices */
		.keyboard-hint {
			display: none;
		}

		/* Expanded content: Adjust padding */
		.expanded-content {
			padding-left: var(--space-sm);
		}
	}

	/* Extra small screens */
	@media (max-width: 480px) {
		.today-grid {
			flex-direction: column;
			gap: var(--space-xs);
		}

		.status-line {
			flex-direction: column;
			align-items: flex-start;
		}

		.view-switcher {
			display: none; /* Default to table/cards, hide switcher */
		}
	}
</style>
