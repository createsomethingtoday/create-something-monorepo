# Akkio Interview Prep: Algorithmic Problem Solving

**Target Role:** Full Stack Web Engineer  
**Company Focus:** AI workflows, marketing analytics, data visualization  
**Timeline:** 1-2 weeks recommended

---

## The Meta-Strategy

Akkio builds tools that make complex data accessible. Their interview will likely test:
1. Can you transform and manipulate data efficiently?
2. Can you think through problems systematically?
3. Can you write clean, maintainable code under pressure?

**Don't optimize for "cracking" interviews. Optimize for demonstrating how you think.**

---

## Week 1: Core Patterns

### Day 1-2: Arrays & Two Pointers

The most common pattern. Master this first.

| Problem | Difficulty | Link | Key Insight |
|---------|------------|------|-------------|
| Two Sum | Easy | [LC #1](https://leetcode.com/problems/two-sum/) | Hash map for O(1) lookup |
| Best Time to Buy/Sell Stock | Easy | [LC #121](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) | Track min so far |
| Contains Duplicate | Easy | [LC #217](https://leetcode.com/problems/contains-duplicate/) | Set for uniqueness |
| Product of Array Except Self | Medium | [LC #238](https://leetcode.com/problems/product-of-array-except-self/) | Prefix/suffix products |
| Maximum Subarray | Medium | [LC #53](https://leetcode.com/problems/maximum-subarray/) | Kadane's algorithm |
| 3Sum | Medium | [LC #15](https://leetcode.com/problems/3sum/) | Sort + two pointers |

**Pattern to internalize:**
```javascript
// Two pointers - converging
let left = 0, right = arr.length - 1;
while (left < right) {
  // Compare/process arr[left] and arr[right]
  // Move pointers based on condition
}
```

### Day 3-4: Hash Maps & Frequency Counting

Critical for data transformation—exactly what Akkio does.

| Problem | Difficulty | Link | Key Insight |
|---------|------------|------|-------------|
| Valid Anagram | Easy | [LC #242](https://leetcode.com/problems/valid-anagram/) | Character frequency |
| Group Anagrams | Medium | [LC #49](https://leetcode.com/problems/group-anagrams/) | Sorted string as key |
| Top K Frequent Elements | Medium | [LC #347](https://leetcode.com/problems/top-k-frequent-elements/) | Frequency map + sort |
| Longest Consecutive Sequence | Medium | [LC #128](https://leetcode.com/problems/longest-consecutive-sequence/) | Set for O(1) contains |
| Subarray Sum Equals K | Medium | [LC #560](https://leetcode.com/problems/subarray-sum-equals-k/) | Prefix sum + hash map |

**Pattern to internalize:**
```javascript
// Frequency counting
const freq = new Map();
for (const item of arr) {
  freq.set(item, (freq.get(item) || 0) + 1);
}

// Prefix sum for subarray problems
const prefixSum = new Map([[0, 1]]); // sum -> count
let sum = 0;
for (const num of nums) {
  sum += num;
  // Check if (sum - target) exists in prefixSum
}
```

### Day 5-6: Strings & Sliding Window

String manipulation is everywhere in web dev.

| Problem | Difficulty | Link | Key Insight |
|---------|------------|------|-------------|
| Valid Palindrome | Easy | [LC #125](https://leetcode.com/problems/valid-palindrome/) | Two pointers, skip non-alphanumeric |
| Longest Substring Without Repeating | Medium | [LC #3](https://leetcode.com/problems/longest-substring-without-repeating-characters/) | Sliding window + set |
| Minimum Window Substring | Hard | [LC #76](https://leetcode.com/problems/minimum-window-substring/) | Sliding window + freq map |
| Valid Parentheses | Easy | [LC #20](https://leetcode.com/problems/valid-parentheses/) | Stack |
| Encode and Decode Strings | Medium | [LC #271](https://leetcode.com/problems/encode-and-decode-strings/) | Length prefix encoding |

**Pattern to internalize:**
```javascript
// Sliding window - variable size
let left = 0;
for (let right = 0; right < s.length; right++) {
  // Expand window: add s[right] to window state
  
  while (/* window invalid */) {
    // Shrink window: remove s[left] from window state
    left++;
  }
  
  // Update result if window is valid
}
```

### Day 7: Stacks & Queues

Common for parsing, validation, and BFS.

| Problem | Difficulty | Link | Key Insight |
|---------|------------|------|-------------|
| Valid Parentheses | Easy | [LC #20](https://leetcode.com/problems/valid-parentheses/) | Stack for matching |
| Min Stack | Medium | [LC #155](https://leetcode.com/problems/min-stack/) | Track min at each level |
| Daily Temperatures | Medium | [LC #739](https://leetcode.com/problems/daily-temperatures/) | Monotonic stack |
| Evaluate Reverse Polish Notation | Medium | [LC #150](https://leetcode.com/problems/evaluate-reverse-polish-notation/) | Stack for operators |

---

## Week 2: Trees, Recursion & Real-World Patterns

### Day 8-9: Trees & Recursion

Nested data structures are common in UI (DOM, component trees, JSON).

| Problem | Difficulty | Link | Key Insight |
|---------|------------|------|-------------|
| Invert Binary Tree | Easy | [LC #226](https://leetcode.com/problems/invert-binary-tree/) | Recursive swap |
| Maximum Depth of Binary Tree | Easy | [LC #104](https://leetcode.com/problems/maximum-depth-of-binary-tree/) | DFS, return max |
| Same Tree | Easy | [LC #100](https://leetcode.com/problems/same-tree/) | Recursive comparison |
| Binary Tree Level Order Traversal | Medium | [LC #102](https://leetcode.com/problems/binary-tree-level-order-traversal/) | BFS with queue |
| Validate BST | Medium | [LC #98](https://leetcode.com/problems/validate-binary-search-tree/) | Pass min/max bounds |
| Lowest Common Ancestor | Medium | [LC #236](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/) | Recursive search |

**Pattern to internalize:**
```javascript
// Tree DFS template
function dfs(node) {
  if (!node) return /* base case */;
  
  // Process node.val
  const left = dfs(node.left);
  const right = dfs(node.right);
  
  return /* combine results */;
}

// Tree BFS template
function bfs(root) {
  if (!root) return [];
  const queue = [root];
  const result = [];
  
  while (queue.length) {
    const levelSize = queue.length;
    const level = [];
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}
```

### Day 10-11: Sorting & Binary Search

Fundamentals that come up in optimization questions.

| Problem | Difficulty | Link | Key Insight |
|---------|------------|------|-------------|
| Binary Search | Easy | [LC #704](https://leetcode.com/problems/binary-search/) | Classic template |
| Search Insert Position | Easy | [LC #35](https://leetcode.com/problems/search-insert-position/) | Find insertion point |
| Find Minimum in Rotated Array | Medium | [LC #153](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/) | Modified binary search |
| Search in Rotated Array | Medium | [LC #33](https://leetcode.com/problems/search-in-rotated-sorted-array/) | Two-phase binary search |
| Merge Intervals | Medium | [LC #56](https://leetcode.com/problems/merge-intervals/) | Sort + merge |

**Pattern to internalize:**
```javascript
// Binary search template
function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  
  return -1; // or left for insertion point
}
```

### Day 12-13: Dynamic Programming (Light)

You probably won't get hard DP, but know the basics.

| Problem | Difficulty | Link | Key Insight |
|---------|------------|------|-------------|
| Climbing Stairs | Easy | [LC #70](https://leetcode.com/problems/climbing-stairs/) | Fibonacci pattern |
| House Robber | Medium | [LC #198](https://leetcode.com/problems/house-robber/) | Take or skip |
| Coin Change | Medium | [LC #322](https://leetcode.com/problems/coin-change/) | Min coins to make amount |
| Longest Increasing Subsequence | Medium | [LC #300](https://leetcode.com/problems/longest-increasing-subsequence/) | DP or binary search |

**Pattern to internalize:**
```javascript
// Bottom-up DP template
function dp(input) {
  const n = input.length;
  const dp = new Array(n + 1).fill(0);
  
  // Base case
  dp[0] = /* base value */;
  
  for (let i = 1; i <= n; i++) {
    // Recurrence relation
    dp[i] = /* some function of dp[i-1], dp[i-2], etc. */;
  }
  
  return dp[n];
}
```

### Day 14: Full-Stack Specific Problems

These mirror real Akkio work: data transformation, aggregation, API responses.

| Problem | Difficulty | Link | Why It's Relevant |
|---------|------------|------|-------------------|
| Flatten Nested List Iterator | Medium | [LC #341](https://leetcode.com/problems/flatten-nested-list-iterator/) | Nested JSON handling |
| Serialize/Deserialize Binary Tree | Hard | [LC #297](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) | Data persistence |
| LRU Cache | Medium | [LC #146](https://leetcode.com/problems/lru-cache/) | Caching strategy |
| Design Hit Counter | Medium | [LC #362](https://leetcode.com/problems/design-hit-counter/) | Analytics, time windows |
| Time Based Key-Value Store | Medium | [LC #981](https://leetcode.com/problems/time-based-key-value-store/) | Versioned data |

---

## JavaScript/TypeScript Specifics

Know these cold—they'll come up in a JS-focused interview.

### Array Methods
```javascript
// Transform
arr.map(x => x * 2)
arr.filter(x => x > 0)
arr.reduce((acc, x) => acc + x, 0)

// Search
arr.find(x => x.id === targetId)
arr.findIndex(x => x.id === targetId)
arr.includes(value)
arr.indexOf(value)

// Sort (mutates!)
arr.sort((a, b) => a - b)  // ascending
arr.sort((a, b) => b - a)  // descending
arr.sort((a, b) => a.name.localeCompare(b.name))  // strings

// Combine
arr1.concat(arr2)
[...arr1, ...arr2]
arr.flat()
arr.flatMap(x => [x, x * 2])
```

### Object/Map Operations
```javascript
// Object
Object.keys(obj)
Object.values(obj)
Object.entries(obj)
Object.fromEntries(entries)

// Map (better for frequent add/delete)
const map = new Map();
map.set(key, value);
map.get(key);
map.has(key);
map.delete(key);
map.size;

// Set
const set = new Set(arr);
set.add(value);
set.has(value);
set.delete(value);
[...set]  // back to array
```

### Common Gotchas
```javascript
// Shallow vs deep copy
const shallow = [...arr];           // Only copies first level
const deep = JSON.parse(JSON.stringify(obj));  // Deep but slow

// Sort is lexicographic by default!
[10, 2, 1].sort()                   // [1, 10, 2] - WRONG
[10, 2, 1].sort((a, b) => a - b)    // [1, 2, 10] - RIGHT

// == vs ===
null == undefined   // true
null === undefined  // false

// Falsy values
// false, 0, '', null, undefined, NaN
```

---

## Mock Interview Checklist

Before each practice session, simulate real conditions:

### Setup
- [ ] Timer set for 45 minutes
- [ ] No IDE autocomplete (use plain text editor or LeetCode)
- [ ] Quiet environment
- [ ] Talk out loud (or record yourself)

### During Problem
- [ ] Read problem twice before coding
- [ ] Ask clarifying questions (write them down)
- [ ] Work through example by hand
- [ ] State approach before coding
- [ ] Write code, then trace through with example
- [ ] Analyze time/space complexity
- [ ] Discuss optimizations

### After Problem
- [ ] Review solution even if you got it right
- [ ] Note the pattern for future reference
- [ ] If stuck >20 min, look at hints, then solution
- [ ] Reattempt problem in 2-3 days

---

## Day Before Interview

1. **Don't cram new problems** — Review patterns you've learned
2. **Sleep well** — Cognitive performance tanks without sleep
3. **Prep your environment** — Test your mic, camera, screen share
4. **Have water nearby** — Interviews are mentally draining
5. **Review the company** — Akkio's product, recent news, team

---

## During the Interview

### The Opening (2-3 min)
"Before I start coding, let me make sure I understand the problem..."
- Repeat the problem in your own words
- Ask about edge cases (empty input, single element, duplicates?)
- Ask about constraints (size of input, value ranges?)

### The Approach (3-5 min)
"Here's how I'm thinking about this..."
- Describe your approach at a high level
- Mention the data structures you'll use and why
- State expected time/space complexity
- Ask: "Does this approach make sense before I code it?"

### The Coding (20-25 min)
- Write clean, readable code
- Use meaningful variable names
- Add brief comments for complex logic
- If stuck, say so: "I'm thinking through this edge case..."

### The Testing (5 min)
- Trace through your code with the example
- Test edge cases: empty, single, duplicates
- Fix bugs calmly—everyone makes them

### The Wrap-up (2-3 min)
- State final complexity
- Mention potential optimizations
- Ask if they'd like you to implement any changes

---

## Complexity Cheat Sheet

| Operation | Array | Hash Map | Set | Binary Search |
|-----------|-------|----------|-----|---------------|
| Access | O(1) | O(1) | — | O(log n) |
| Search | O(n) | O(1) | O(1) | O(log n) |
| Insert | O(n) | O(1) | O(1) | — |
| Delete | O(n) | O(1) | O(1) | — |

| Algorithm | Time | Space |
|-----------|------|-------|
| Two pointers | O(n) | O(1) |
| Sliding window | O(n) | O(k) |
| Hash map lookup | O(n) | O(n) |
| Binary search | O(log n) | O(1) |
| BFS/DFS | O(V + E) | O(V) |
| Sorting | O(n log n) | O(n) |

---

## Resources

- **NeetCode** — https://neetcode.io (best video explanations)
- **Grind 75** — https://www.techinterviewhandbook.org/grind75
- **LeetCode Patterns** — https://seanprashad.com/leetcode-patterns/
- **JavaScript Algorithms** — https://github.com/trekhleb/javascript-algorithms
- **Pramp** — https://pramp.com (free mock interviews)

---

*"The goal isn't to memorize solutions. It's to recognize patterns so quickly that the solution emerges naturally."*
