# Proposed Frontiers

**Draw the borders. Read what happens next.**

[Play in your browser](https://sykespicot.io)

Proposed Frontiers is a border-drawing game set in January 1916. Create a proposed political map, then follow an alternate-history chronicle shaped by your territorial choices.

It explores a problem that looks deceptively simple on paper: how do you turn competing promises, populations, geography and strategic interests into a workable map?

## What it does

- Lets you draw and revise political territories on an interactive map.
- Provides historical overlays, cities, ports and railway context.
- Generates a deterministic alternate-history chronicle from your proposal.
- Saves proposals in your browser so you can return to them.
- Offers a shared league with seven-day rounds and server-validated scoring.

## Try it

1. [Open the game](https://sykespicot.io) and read the January 1916 brief.
2. Draw a proposal, using the map's overlays and geographical context.
3. Review the results and the chronicle.
4. Revise the map to explore how different choices change the outcome.

## Historical approach

The scenario is grounded in historical pressures, but the resulting chronology is game fiction. It is an exploration of counterfactual decisions, not a forecast or an authoritative settlement of historical disputes.

Territorial checks use assigned map cells and their connections. Railway alignments are schematic rather than surveyed track coordinates, and mapped demographic areas are not population counts.

## Technical overview

The application uses browser JavaScript and an interactive map editor. The browser and server share the deterministic chronicle and scoring logic; the server validates league submissions and stores results in Cloudflare D1. The live application runs on Cloudflare Workers.

## About this repository

This is the public project showcase for Proposed Frontiers. The production source and deployment configuration are maintained separately in a private repository. There is no runnable application or installation step in this repository.

## Feedback

[Open an issue](https://github.com/neddonovan1-crypto/proposed-frontiers/issues) for a bug, historical-source suggestion or gameplay idea. For a bug, include the steps that produced it and what you expected to happen.

Created by [Ned Donovan](https://neddonovan.co).
