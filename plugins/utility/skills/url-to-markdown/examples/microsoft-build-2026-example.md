---
title: 'Microsoft Build 2026: Be yourself at work - The Official Microsoft Blog'
author: Kyle Daigle
date: 2026-06-02
url: https://blogs.microsoft.com/blog/2026/06/02/microsoft-build-2026-be-yourself-at-work/
hostname: microsoft.com
sitename: The Official Microsoft Blog
description: 'Platforms shift when developers build. We explore, choose tools, dream, create. This platform shift comes with more information than ever, ready at your fingertips. This shift, it’s about building fast AND THEN: it’s about building, operating, optimizing and observing. Securing your infrastructure, applications and agents in a seamless way that doesn’t slow you down from...'
categories: [Featured, The Official Microsoft Blog]
source_url: https://blogs.microsoft.com/blog/2026/06/02/microsoft-build-2026-be-yourself-at-work/
fetched: 2026-06-02T00:00:00Z
http_status: 200
word_count: 2429
---
Platforms shift when developers build. We explore, choose tools, dream, create.

This platform shift comes with more information than ever, ready at your fingertips. This shift, it’s about building fast AND THEN: it’s about building, operating, optimizing and observing. Securing your infrastructure, applications and agents in a seamless way that doesn’t slow you down from the moment you open your laptop to the moment you ship to production.

But there’s a duality in being a developer – you’re a tinkerer, choosing your own tools and models, and you’re an enterprise builder, shipping systems that demand governance, security and trust from day one.

Developers don’t need another way to just build and run an agent or app. They need trust. They need native context and knowledge. Most of all, they need choice to access the right model for the right problem.

This duality is where Microsoft thrives. We ask: what does it mean to be a modern developer today? And at Microsoft Build, we shared how we empower developers to build in this era of ubiquitous intelligence with the controls and security you expect at scale – on a platform that’s model diverse, open and heterogeneous at every layer of the stack. Bringing together what *you* know with what the *world* knows natively.

There’s a lot of news today, but there are three themes to anchor on.

**First, intelligence that’s truly yours.** With the Microsoft Agent Platform powered by your context and intelligence from Microsoft IQ, you can build your agent in GitHub, deploy it to Microsoft Foundry and optimize it automatically with models best suited for the job. Ground it in your intelligence and the world’s knowledge, then access it via Microsoft Teams, M365 or anywhere your team works. Designed to reduce the need to make tradeoffs between context and governance, security and speed, or models and tools.

**Second, the full stack built your way.** You should be able to build the way you want to build, with the tools, models and workflows you choose, and make it real. This expands beyond the agent platform to across the stack. Silicon to OS to developer tools to cloud – and that starts with Windows. Not Windows for “Windows developers.” Windows for developers, period. We’re bringing a new developer configuration that gives you more flexibility, a frictionless intelligent shell and terminal experience, local sandboxing for agents, new Windows Subsystem for Linux capabilities and powerful options to do it on your local machine.

**Third is what comes next**, where agentic systems move from code to human progress, amplifying what scientists and researchers can achieve. New frontiers in science and computing that start with the same developer platform underneath.

Together, developers get a multi-model ecosystem, from your laptop to the cloud, so you can build the frontier without giving up the control and craft that truly makes the work yours.

And as always, it starts with the developer. Let’s dive in.

**Agents that know you, your business, and the world**

As models become more capable and more available, the differentiator for any organization is no longer access to intelligence, but ownership. How does your expertise, data and way of working become a system that continuously learns and drives better outcomes? The goal is an ecosystem that gives companies their own agency, not one that funnels value back to a consultant or the model maker.

Your agents should reflect how you think and operate, from your business logic and institutional knowledge, down to your workflows.

That starts with context. **Microsoft IQ**, generally available today across GitHub Copilot, Microsoft Foundry and Copilot Studio, is a new context layer that grounds agents in both world knowledge and enterprise knowledge. [ Work IQ](https://aka.ms/MBJ02yr26) is the workplace intelligence layer for agents, capturing how work actually happens across Microsoft 365, organizational systems and external sources: people, emails, documents, meetings and how they connect. The Work IQ APIs, generally available on June 16, provide programmatic access to this intelligence layer and give agents the context they need to work effectively in your organization. 

[provides a shared semantic foundation over structured business data.](https://aka.ms/azure-data-Build26)

**Fabric IQ**[ties it together and enables retrieval planning across both enterprise knowledge and the live web.](https://aka.ms/BuildFoundryIQ)

**Foundry IQ**New to the family is [ Web IQ](https://aka.ms/nextgengrounding), announced today: the fastest real-world grounding you can give your agents. An AI-first web search stack that’s model-agnostic and MCP-native, returning relevant passages at nearly 2.5x the speed of the next best alternative.

We’re also looking at how this context applies to new form factors, specifically always-on autonomous agents. ** Microsoft Scout** is a new personal agent for work that we are bringing to Frontier customers today. Built on OpenClaw and WorkIQ, Microsoft Scout understands how you work, uses the tools you already live in, like Teams and Outlook, and proactively handles things like meeting prep, scheduling conflicts and routine tasks without asking. We’re excited to share more soon as we expand what Microsoft Scout can do and roll it out more broadly.

On the model layer, the Microsoft AI Superintelligence Team released a family of seven new in-house models, starting with [ MAI-Thinking-1](http://aka.ms/MAI-Build) – Microsoft AI’s first reasoning model. Trained from scratch with zero distillation on enterprise grade, clean and commercially licensed data you can build on with confidence.

It’s a mid-sized, 35 billion active parameter model with a 256K context window built for high efficiency and performance, but importantly, at a low-token cost. On a blind test, independent raters prefer it to Sonnet 4.6 [1], and it matches Opus 4.6 on coding abilities on SWE Bench Pro [2]. MAI-Thinking-1 was designed to be good at complex multi-step instructions, long-context reasoning and code generation, and it’s open now on Foundry in private preview.

But that isn’t the only new model. MAI-Image-2.5 and its flash variant are Microsoft’s first models to serve both text-to-image (#3 on the Arena AI leaderboard) and enabling image-to-image workloads (#2 on the Arena AI leaderboard, surpassing Nano Banana 2). These are especially useful in creative workflows, when you want some assistance taking a concept into reality or enhancing existing image work. These models are live in PowerPoint, rolling out on OneDrive, and today, they’re landing on Foundry with market-leading quality per dollar.

There are other new members of the MAI family too: MAI Transcribe 1.5 combines state-of-the-art accuracy across 43 languages, with streaming coming soon. MAI-Voice-2 and its flash variant are now available in more than 15 additional languages with new voice options. And MAI-Code-1, our inference efficient coding model tuned for GitHub, is now available in Copilot and VS Code.

Developer choice doesn’t stop at our catalog. MAI models will also be available on Fireworks AI, Baseten and Open Router. And [Fireworks AI is now generally available on Foundry](http://aka.ms/BuildFoundryModels), giving developers a single platform experience with enterprise governance and Azure data residency, regardless of the model they choose.

For organizations ready to make intelligence truly their own, [ Frontier Tuning](https://aka.ms/frontiertuningblog) applies reinforcement learning within your compliance boundary so agents can learn how the business actually works. Using your own data, domain knowledge and workflows, the result is a loop that sharpens as agents work. Available in private preview today.

And security and governance wraps the entire system. [ Agent 365 for local agents](https://aka.ms/Build2026/SecureLocalAgents) extends Entra, Defender and Purview into a single control plane to observe, govern and secure agents across your estate, regardless of where they’re hosted or what framework they’re built on. This is how you build at speed while maintaining control.

Alongside it is an open, end-to-end trust stack for AI agents on any framework anchored by two open-source projects: [Adaptive Spec-driven Scoring for Evaluation and Regression Testing  (ASSERT)](https://commandline.microsoft.com/assert-written-intent-executable-evals/) for policy-driven safety evaluation, and the 

[to standardize where and how to apply controls in the agent loop.](https://commandline.microsoft.com/agent-control-specification-runtime-governance/)

**Agent Control Specification**Also strengthening our defense is [ Codename MDASH](https://aka.ms/AgenticDevSecOps). Our new multi-model agentic security system deploys 100+ agents to find exploitable bugs by reasoning about data flow, business logic and exploit chains with context-aware fixes delivered directly in the Defender Portal.

**The full stack, your way**

When we think about work in the agentic age, it requires a ubiquitous intelligence platform that spans cloud and edge. But as a developer, how do you build these rich, agentic systems while staying firmly in control? That means staying in flow instead of waiting on tools and running experiments in minutes rather than hours.

It starts at the silicon, and that’s where ** Surface RTX Spark Dev Box** comes in – it’s designed for sustained workloads: long-running training jobs, agentic AI pipelines and local model fine-tuning.

Powered by NVIDIA RTX Spark, it delivers up to one petaflop of AI compute and 128 GB of unified memory, capable of running up to 120B parameter LLMs with up to 1 million tokens context using agents locally without cloud GPU instances [3]. Windows Services for Linux (WSL) 2 with native GPU passthrough and full CUDA support comes pre-configured for developers, with Visual Studio Code, GitHub Copilot and many more of your favorite tools pre-installed. Surface RTX Spark Dev Box will be available later this year in the US via Microsoft.com.

In the OS layer, Microsoft is making Windows an agent-native runtime. **Microsoft Execution Containers (MXC)**, now in preview, gives developers and IT administrators a simpler way to create enterprise-grade sandboxed environments for agents, with containment enforced by the operating system itself. Describe your requirements once, and Windows enforces them everywhere your agents run.

This technology is now being used by [ OpenClaw on Windows](https://aka.ms/Windows-Build2026), enabling execution of multi-step workflows inside these OS-enforced boundaries. NVIDIA’s 

**OpenShell**secure runtime for autonomous agents uses MXC and adds policy management, inference routing and PII obfuscation. Together, these capabilities give developers a safe environment for agent development and deployment and provide IT teams with the governance tools they need across local devices and cloud environments.

And when agents move to the cloud, [ hosted agents in Foundry Agent Service](http://aka.ms/BuildFoundryAgents), in preview, provide the same model at scale: instant-on sandboxes per session, isolated execution, persistent memory and elastic scale. Think of it as the primitive for agents the way containers were for cloud-native apps.

Agentic development flows, whether in the IDE or in the command line, helps us write code faster than ever before, but that’s only one part of building software.

The [ GitHub Copilot app](https://github.blog/news-insights/product-news/github-copilot-app-the-agent-native-desktop-experience/?utm_source=live-blog-copilot-app-desktop-blog-cta&utm_medium=blog&utm_campaign=msbuild-2026), now in preview, brings agentic development to a native desktop experience – and a much wider audience. Start from an idea, an existing issue or PR, orchestrate multiple agent sessions in parallel, and keep changes moving through review, CI and merge. Each session uses git worktrees, so work stays separated. Copilot handles execution, while developers say in control.

Developers can generate applications in seconds, but getting those apps into production still requires stitching together databases, APIs, authentication and infrastructure.

At the platform layer, [ Rayfin](https://aka.ms/rayfin-blog), now in preview, solves that. It brings a managed, backend-as-a-service to Microsoft Fabric, defined through GitHub-based workflows, so developers can move from prototype to production without managing infrastructure. Integration with 

**Replit**creates a fast path from prototype to enterprise-grade deployment with governance from day one. And as agentic applications scale,

**Azure HorizonDB**delivers performance and reliability to meet your most demanding database requirements. It’s a fully managed PostgreSQL service on Azure that delivers more than 3x the throughput of comparable self-managed setups in internal testing.

**The future belongs to builders**

In the same way long-running agents have helped redefine software development and the role of the developer, new agents will help change research and development and what scientists can achieve.

[ Microsoft Discovery](https://aka.ms/MicrosoftDiscoveryBlog) is generally available today. Built on Azure, it gives researchers an enterprise-grade agentic AI platform for the full science workflow. BHP is using it to find copper-leaching solutions in months instead of years. Syensqo is accelerating semiconductor R&D. GSK is iterating on drug discovery. Additionally, a free Discovery local app was announced for the broader scientific community. It is available in preview and only requires a GitHub Copilot account.

Finally, our next generation quantum computing chip [ Majorana 2](https://aka.ms/m2blog) represents a giant step toward scale: an average qubit lifetime of 20 seconds with instances up to a minute, 1,000x higher reliability than our previous generation, and a path to one million qubits on a chip that fits in the palm of your hand. With the help of agentic AI, we will achieve a scalable quantum machine by 2029.

***

Platforms don’t shift on their own; developers build them forward. Today is about giving you more to build with.

These are just some of the announcements at Build. We’re excited to connect with those of you joining virtually and in person for keynotes, code deep dives, hack sessions and more. Many sessions will also be available on demand.

For the full set of news, visit the [Microsoft Build Live](https://aka.ms/microsoft-build-2026-live-blog) blog.

Now, let’s build.

***

**Footnotes:**

*1: measured via Surge our independent human rating partner *

*2: Based on the SWE Bench Pro Benchmark*

*3: Source: NVIDIA. Based on 1 Theoretical FP4 TOPS using the sparsity feature.*

**Related:
**Check out our live blog, 

[Microsoft Build Live](https://news.microsoft.com/build-2026-live-blog/)

Connect your local project to the Microsoft Build session catalog with this GitHub Copilot CLI skill: [microsoft/Build-CLI: Experience Microsoft Build, directly from your terminal, with GitHub Copilot C…](https://github.com/microsoft/Build-CLI)

Read more about [all the updates for developers](https://news.microsoft.com/build-2026/)