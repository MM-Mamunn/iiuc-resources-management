---
name: frontend-design
description: >-
  Create or refine distinctive, brief-specific frontend interfaces. Use when
  designing a new page, landing page, dashboard, or component, or when a UI
  needs a stronger visual direction, layout, typography, or interaction design.
---

# Frontend design

Design each interface for its actual product, audience, and purpose. Use the
project's existing stack and design system, but make intentional visual choices
instead of falling back to a generic starter template.

## Before implementation

1. Read the relevant product brief and inspect nearby screens and shared
   components. Reuse established patterns where they serve the task; do not
   invent product features or contradict the brief.
2. Identify the page's primary audience, task, and most important content. If
   essential context is missing, ask the user before committing to a direction.
3. Choose a concise visual direction: palette, type roles, layout and alignment,
   and the one or two details that should make this page feel specific.
4. Check that the direction follows the brief and is not just a familiar
   template. Revise choices that could be applied unchanged to any product.

## Visual decisions

- Give the first viewport a clear focal point that fits the content; do not
  assume every page needs the same hero, headline, or call-to-action layout.
- Use typography, spacing, color, and grouping to express hierarchy. Keep text
  readable, and choose typefaces and type scales for the product rather than
  defaulting to the same combination each time.
- Let structure clarify relationships and sequence. Avoid decorative labels,
  borders, badges, or numbering that do not help users understand the content.
- Use motion selectively. Prefer feedback that explains a user action over
  constant entrance effects or ornamental transitions.
- Keep supporting elements restrained around the primary visual idea. Remove
  decoration that competes with content or interaction.
- Use real, brief-relevant content when available. When examples are needed,
  write plausible copy rather than generic filler or claims about unbuilt
  functionality.

## Build and review

1. Implement the approved direction using the repository's existing components,
   tokens, and conventions. For this app, consult
   [UI and design system](../ui-design-system/SKILL.md) and
   [coding standards](../coding-standards/SKILL.md).
2. Check the result at mobile and desktop widths. Ensure semantic structure,
   keyboard access, visible focus, sufficient contrast, and reduced-motion
   support where animation is used.
3. Review the rendered page or screenshots when the environment supports it.
   Compare the result with the brief, correct visual or responsive issues, and
   remove unnecessary details before considering the work complete.
