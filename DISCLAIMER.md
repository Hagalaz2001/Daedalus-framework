# Disclaimer

Daedalus is an AI-assisted development framework. It ships rules, skills, agent definitions, templates,
checklists and generators that are meant to be used together with AI coding tools. Read this before you use it.

Daedalus built the wings; how they are flown is up to the flyer. **The person using it is in charge.** You decide
what gets built, you review what the AI wrote, and you are the one who ships it. Nothing here shifts that responsibility to the maintainers, the contributors, a tool or an AI provider.

## What you must understand

1. **AI output can be wrong.** It can be incorrect, insecure, biased, out of date, non-compliant with a law or
   standard, or copied from code under a licence you cannot use. It can also look correct and pass tests while being
   wrong. Treat every AI-written line as untrusted code from a stranger until a human has read and verified it.
2. **You are solely responsible** for reviewing, testing, securing, licensing, documenting and deploying everything you
   build with this framework, and for what it does to your users, your data and your money.
3. **No warranty.** The software and all content in this repository are provided "as is", without warranty of any
   kind, as stated in the [MIT licence](LICENSE). To the fullest extent the law allows, the maintainers, contributors
   and the providers of any AI model or tool you use with it are not liable for any claim, loss or damage arising from
   its use, including damage caused by AI-generated code, commands or decisions.
4. **Packs and checklists are aids, not advice.** The packs for regulated or safety-relevant domains (banking and
   payments, healthcare, EU compliance, low-level and embedded systems, and the rest) and every checklist,
   template and sample in them are starting points written by volunteers. They are not legal, financial, medical,
   safety or regulatory advice, they are not a certification or an audit, and following them does not make a product
   compliant with PCI DSS, SOC 2, ISO 27001, HIPAA, GDPR, the EU AI Act or any other rule. Ask a qualified
   professional and, where needed, your auditor or regulator.
5. **Follow your own rules.** Your organisation's policies, your contracts and the terms of every AI provider and
   third-party service you use apply to you. Check what each AI tool does with your prompts and code.
6. **Protect secrets and personal data.** Never paste secrets, credentials, customer data, health data or other
   personal data into an AI tool you have not approved for that data. The guard hooks and scanners in this repository
   reduce mistakes; they do not catch everything.

## Human in the loop, always

AI may draft, refactor, explain and test. A named human owns every change that reaches production and signs it off.
AI must never deploy, move money, delete data, change authentication or permissions, or touch production secrets
without a person doing or explicitly approving that exact action. The rules are in
[`template/docs/RESPONSIBLE-AI.md`](template/docs/RESPONSIBLE-AI.md) and every generated project carries a copy.

## Before you publish or sell something built with this

Have the code reviewed by a person who understands it, run the checks, read the licences of what you ship, and, if
the product is regulated, get professional advice first.

This document is not legal advice and has not been reviewed by a lawyer. If you fork or redistribute this project in
a commercial or regulated setting, have your own counsel review it.
