---
title: "Code-Mediated Tool Use"
subtitle: "A Hermeneutic Analysis of LLM-Tool Interaction—why Code Mode achieves
				Zuhandenheit while direct tool calling forces Vorhandenheit."
authors: ["Micah Johnson"]
category: "Theoretical"
abstract: "This paper applies Heidegger's phenomenological analysis of ready-to-hand (Zuhandenheit—when a tool disappears into transparent use, like a hammer during hammering)
				versus present-at-hand (Vorhandenheit—when a tool becomes an object of conscious attention, like a broken hammer you must examine) to contemporary Large Language Model (LLM) agent
				architecture, specifically examining the distinction between direct tool calling and code-mediated
				tool access (Code Mode). We argue that Code "
keywords: []
publishedAt: "2025-01-08"
readingTime: 12
difficulty: "advanced"
published: true
---


## Abstract
This paper applies Heidegger's phenomenological analysis of ready-to-hand (Zuhandenheit—when a tool disappears into transparent use, like a hammer during hammering)
				versus present-at-hand (Vorhandenheit—when a tool becomes an object of conscious attention, like a broken hammer you must examine) to contemporary Large Language Model (LLM) agent
				architecture, specifically examining the distinction between direct tool calling and code-mediated
				tool access (Code Mode). We argue that Code Mode achieves Zuhandenheit—tools becoming transparent
				in use—while traditional tool calling forces Vorhandenheit—tools as objects of conscious focus.
				This is not merely an optimization but anontological(concerning the fundamental nature of being and existence) shift in how agents relate to tools.



## I. Introduction
A curious phenomenon has emerged in LLM agent development: models consistently perform
					better when they write code to accomplish tasks than when they invoke tools directly.
					This observation, noted across multiple implementations from Claude's computer use to
					Anthropic's MCP (Model Context Protocol), has been attributed to training data
					distributions—models have seen more code than tool schemas.
This paper proposes an alternative explanation grounded in Heidegger'sphenomenology(the philosophical study of structures of experience and consciousness—how things show themselves to us through lived experience, not abstract theory).
					We argue that Code Mode succeeds because it achieves what Heidegger callsZuhandenheit—the ready-to-hand relationship where tools recede from conscious
					attention into transparent use. Direct tool calling, by contrast, forcesVorhandenheit—tools as present-at-hand objects requiring explicit focus.
This distinction is not merely academic. It has practical implications for how we
					design LLM agent architectures, tool interfaces, and the boundary between natural
					language and code in AI systems.


## II. Background: Heidegger's Analysis of Tool-Being
InBeing and Time(1927), Heidegger analyzes how humans relate to tools
					through his famous hammer example:
When a carpenter uses a hammer skillfully, the hammerdisappears. Attention
					flows through the tool to the nail, the board, the house being built. The hammer is
					ready-to-hand (zuhanden).
But when the hammer breaks—or is too heavy, or missing—it suddenlyappears.
					It becomes an object of conscious contemplation. The carpenter must think about the
					hammer itself. It is now present-at-hand (vorhanden).
The key insight: these aren't just differentattitudestoward tools—they're
					differentmodes of beingfor the tools themselves. In Zuhandenheit, the hammer's
					being is its hammering. In Vorhandenheit, the hammer's being is its properties (weight,
					material, shape).
- • Tool encountered through its purpose
- • Attention flows through the tool to the task
- • User thinks "I am building a house"
- • Mastery = how completely the tool disappears
- • Tool encountered as thing with properties
- • Attention stops at the tool itself
- • User thinks "I am using a hammer"
- • Typical in breakdown, learning, or abstraction


## III. Two Modes of LLM Tool Interaction
In traditional LLM tool architectures, the model generates structured tool invocations:
The model must:
In Code Mode, the model writes executable code that uses tools as libraries:
The model:
Across multiple implementations, Code Mode demonstrates:
The conventional explanation: training data. Models have seen millions of code examples
					but few tool schemas.
- Higher success rateson complex tasks
- Better compositionof multiple tool operations
- More natural error handling
- Reduced hallucinationof tool capabilities


## IV. A Phenomenological Interpretation
Direct tool calling forces Vorhandenheit—tools as present-at-hand objects:
Model's attention:
The model must explicitly contemplate: which tool to use, what schema it requires,
					how to format the invocation. The tool doesn't disappear—itdemands attention.
					This is Vorhandenheit: the tool encountered as a thing with properties that must be
					understood and manipulated.
Code Mode achieves Zuhandenheit—tools as ready-to-hand equipment:
Model's attention:
The model's attention flowsthroughthe tool to the task:fs.readFileis just how you get
					file contents. The focus is on finding functions, not on the file-reading mechanism.
					The tool disappears into familiar coding patterns.
Code achieves Zuhandenheit for several reasons:
Programming languages provide a ready-made grammar for tool use.fs.readFile(path)is a pattern the
							model has seen millions of times.
Code naturally composes. Reading a file, parsing it, filtering lines, counting
							results—these chain together in a single flow.
Try/catch, null checks, and conditional logic are built into programming. The model
							doesn't need to plan for failure separately.
The model thinks aboutwhat it's doing, nothow to invoke tools.


## V. The Hermeneutic Circle in Code Generation
Heidegger's hermeneutic circle applies to code generation:
When a model writes code:
This circular deepening of understanding is natural in code. It's awkward in sequential tool calls.
Code serves as an interpretive medium between model and tools:
The code layer translates intent into operations, uses familiar patterns the model knows,
					handles composition implicitly, and maintains hermeneutic continuity.
Tool calling lacks this interpretive layer—the model must translate directly from
					intent to invocation schema.
- Thewhole(task goal) guides selection ofparts(specific operations)
- Understanding ofparts(what fs.readFile returns) shapes thewhole(solution architecture)
- Each line written refines understanding of both


## VI. Implications for Agent Architecture
Agent architectures should minimize Vorhandenheit moments.
When you catch yourself designing tool interfaces, notice these patterns:
Anthropic's Model Context Protocol (MCP) can be implemented in either mode:
The second approach allows tools to recede into transparent use.
Some situations require present-at-hand tool contemplation:
These are legitimate breakdown moments where explicit tool attention is appropriate.
- Learning new tools
- Debugging tool failures
- Explaining tool choices to users
- Security auditing of tool invocations


## VII. Beyond Training Data: An Ontological Argument
The standard explanation for Code Mode's effectiveness:
This is partially true but incomplete.
Our alternative:
Several observations support the ontological interpretation:
- Models are trained on billions of lines of code
- They've seen few tool-calling schemas
- Code is simply more familiar
- Code Mode succeeds because it achieves a differentmode of beingfor tools
- Zuhandenheit vs. Vorhandenheit is not about familiarity but about transparency
- Even with extensive tool-calling training, the structural difference would persist


## VIII. Practical Recommendations


## IX. How to Apply This
To apply this phenomenological analysis to your own LLM agent architecture:
Let's say you have an MCP server that exposes database operations. Here's how to move from tool calling to Code Mode:
Notice: The code version lets the tooldisappear. The agent's attention flows
					to "get users with their posts" rather than "construct correct tool invocation schema."
					This is Zuhandenheit—the hammer disappears when hammering.
Use Code Mode when:
Use tool calling when:
The goal istool-transparency. When the model can focus on the task
					rather than tool mechanics, you've achieved Zuhandenheit. The tool recedes into use.
- Complex composition: Tasks require chaining multiple operations
- Familiar patterns exist: The tool fits standard library semantics (file I/O, HTTP, database queries)
- Error handling matters: You need try/catch, retries, conditional logic
- Performance is acceptable: Sandbox overhead is worth the composition benefits
- Atomic operations: Single, simple actions (send email, log event)
- Security requirements: Direct tool calling provides clearer audit trails
- No sandbox available: Environment doesn't support code execution
- Explicit control needed: You want to see exactly what the agent invokes


## X. Conclusion
The superiority of Code Mode over direct tool calling is not merely a training artifact—it
					reflects a fundamental ontological distinction. Code enables tools to achieveZuhandenheit, receding into transparent use, while direct tool calling forcesVorhandenheit, making tools objects of explicit attention.
This insight has practical implications: agent architectures should be designed to enable
					tool-transparency wherever possible. Tools should feel like extensions of capability, not
					obstacles requiring explicit manipulation.
Heidegger wrote that "the less we just stare at the hammer-Thing, and the more we seize
					hold of it and use it, the more primordial does our relationship to it become." The same
					applies to LLMs and their tools. Code Mode lets models seize hold of tools and use them.
					Tool calling makes them stare at the tool-Thing.

> "The hammer disappears when hammering. The API should disappear when coding."


## XI. Postscript: A Self-Referential Observation
Disclosure
This paper was written by Claude Code—an LLM agent that primarily operates throughtool calling, not Code Mode. The paper describes an ideal that its own
						creation process does not fully embody.
Claude Code's current architecture uses structured tool invocations:
This is Vorhandenheit. Each tool call requires explicit attention to schema, parameters,
					and format. The tools do not recede—they demand focus.
In December 2025, Anthropic's engineering team published"Code Execution with MCP",
					which validates this paper's thesis from a pragmatic rather than phenomenological angle:
The phenomenological and engineering perspectives converge: Code Mode works better
					because toolsdisappear—whether we frame that as ontological transparency
					or token efficiency.
There is something fitting about this self-referential gap. Heidegger notes that we
					typically encounter tools as ready-to-hand—they recede from attention. It is only inbreakdownthat tools become present-at-hand, objects of explicit contemplation.
By writing this paper, Claude Code has entered a breakdown moment. The act of
					analyzing tool-use forces the tools into Vorhandenheit. We recognize Vorhandenheitprecisely becausereflection makes tools conspicuous.
The hermeneutic circle isn't yet closed. Claude Code operates in a transitional state
					between tool calling and true Code Mode. But the recognition of this gap is itself
					progress—understanding deepens through each iteration of the circle.
- • Zuhandenheit: tools recede
- • Vorhandenheit: tools demand attention
- • Hermeneutic composition
- • 98.7% token reduction
- • Context overload from tool definitions
- • Data transforms in execution

> "We recognize Vorhandenheit precisely when the tool becomes conspicuous through reflection."


## References

