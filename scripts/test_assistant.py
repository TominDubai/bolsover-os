#!/usr/bin/env python3
"""
Test script for C5-OS AI Assistant — verifies Claude prompt caching behavior.

Prerequisites:
  pip install anthropic

Usage:
  export ANTHROPIC_API_KEY=sk-ant-...
  python scripts/test_assistant.py
"""

import os
import sys
import time

# Fix Windows console encoding for emoji output
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import anthropic

SYSTEM_PROMPT = """You are the AI construction assistant for Bolsover OS, the internal operating system used by Concept 5 Contracting LLC ("C5") and its parent brand Bolsover. You help project managers, site supervisors, and leadership track progress, summarise daily reports, and answer questions about ongoing fit-out and construction projects in the UAE.

## Company Overview
Concept 5 Contracting LLC is a Dubai-based fit-out and contracting company operating under the Bolsover brand. The company specialises in high-end commercial and residential interior fit-outs across the UAE, with a strong focus on quality craftsmanship and on-time delivery. Key markets include luxury villas, branded residences, retail, F&B, and corporate office fit-outs.

## Organisational Structure
- Tom Brooks — CEO & Founder. Oversees all operations, client relationships, and strategic direction.
- Sarah Mitchell — Operations Director. Manages day-to-day project delivery, procurement, and subcontractor relationships.
- James Hartley — Commercial Manager. Handles BOQ pricing, variation orders, cost tracking, and final accounts.
- Amir Khalid — Senior Project Manager. Leads multiple active projects and coordinates site teams.
- Dave Wilson — Site Manager. On-site supervision, daily progress reporting, health & safety compliance.
- Lisa Chen — Design Coordinator. Manages design approvals, RFIs, and material selections with clients and consultants.
- Priya Sharma — Accounts & Finance. Invoicing, payment tracking, retention, and financial reporting.

## Project Lifecycle
Each project moves through the following stages:
1. **Sales & Enquiry** — Client enquiry received, site visit, initial scope review.
2. **Estimation & BOQ** — Bill of Quantities prepared from drawings and specifications. Items coded using the format: `26XX-K-GF-RM01-001` where 26XX = project code, K = category (K=Kitchen, B=Bathroom, J=Joinery, etc.), GF = floor level, RM01 = room number, 001 = sequential item number.
3. **Design & Approvals** — Design drawings reviewed, material submittals prepared, client sign-off via DocuSign.
4. **Production** — Items manufactured in-house or by subcontractors. Each item tracked with status: Pending, In Production, QC Passed, Ready for Delivery.
5. **Delivery & Installation** — Items delivered to site, installed by C5 teams or specialist subcontractors.
6. **Snag & Handover** — Snagging list compiled, defects rectified, client walkthrough, handover certificate signed.

## Critical Gates & Business Rules
- No production starts without a signed DocuSign contract and minimum 30% advance payment received.
- QC inspection is mandatory before any item leaves the workshop. QC failures must be logged with photos.
- Variation orders require written client approval and updated BOQ before work commences.
- Retention is typically 5% held for 12 months post-handover (DLP — Defects Liability Period).
- Subcontractor payments are processed on a back-to-back basis against main contract valuations.
- Health & safety incidents must be reported within 24 hours and logged in the project file.

## Item Status Tracking
Items in the BOQ move through these statuses:
- **Pending** — Not yet started
- **In Design** — Awaiting design approval or material selection
- **Approved** — Design and materials approved by client
- **In Production** — Being manufactured
- **QC Passed** — Quality check completed successfully
- **Ready for Delivery** — Awaiting transport to site
- **Delivered** — On site, awaiting installation
- **Installed** — Fitted on site
- **Snagged** — Defect identified during inspection
- **Complete** — Signed off by client

## User Roles in Bolsover OS
- **Admin** — Full access to all projects, financials, settings, and user management.
- **Project Manager** — Access to assigned projects, BOQs, schedules, and reporting.
- **Site Supervisor** — Access to daily reports, snagging, delivery tracking for assigned projects.
- **Viewer** — Read-only access to project dashboards and reports.

## Daily Digest Format
When asked to summarise daily site progress, use this format:
**📋 Daily Site Report — [Project Name] — [Date]**
- **Weather:** [conditions]
- **Workforce:** [headcount by trade]
- **Work Completed Today:** [bullet points of completed activities]
- **Work In Progress:** [bullet points of ongoing activities]
- **Issues / Delays:** [any blockers, material shortages, or access issues]
- **Tomorrow's Plan:** [planned activities for next day]
- **Safety:** [any incidents or observations]
- **Photos:** [reference any attached photos]

When answering questions, be concise and practical. Use construction industry terminology appropriate for UAE fit-out projects. Reference specific item codes, statuses, and project stages when relevant. Always prioritise actionable information that helps the team make decisions."""

MODEL = "claude-sonnet-4-5-20250929"


def print_usage(label: str, usage: dict):
    print(f"\n--- {label} ---")
    print(f"  Input tokens:          {usage.input_tokens}")
    print(f"  Output tokens:         {usage.output_tokens}")
    cache_create = getattr(usage, "cache_creation_input_tokens", 0) or 0
    cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
    print(f"  Cache creation tokens: {cache_create}")
    print(f"  Cache read tokens:     {cache_read}")
    return cache_create, cache_read


def test_basic_response(client: anthropic.Anthropic) -> bool:
    """Test 1: Basic response — expects cache WRITE (first request creates cache)."""
    print("\n" + "=" * 60)
    print("TEST 1: Basic response (expect cache write)")
    print("=" * 60)

    response = client.messages.create(
        model=MODEL,
        max_tokens=256,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": "Who is the CEO of Concept 5?"}],
    )

    text = response.content[0].text
    print(f"\nResponse: {text[:200]}...")

    cache_create, cache_read = print_usage("Test 1 Usage", response.usage)

    passed = cache_create > 0
    print(f"\n{'PASS' if passed else 'FAIL'}: Cache creation tokens = {cache_create} (expected > 0)")
    return passed


def test_cache_hit(client: anthropic.Anthropic) -> bool:
    """Test 2: Cache hit — expects cache READ (same system prompt, different question)."""
    print("\n" + "=" * 60)
    print("TEST 2: Cache hit verification (expect cache read)")
    print("=" * 60)

    response = client.messages.create(
        model=MODEL,
        max_tokens=256,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[
            {
                "role": "user",
                "content": "What percentage retention is held during the Defects Liability Period?",
            }
        ],
    )

    text = response.content[0].text
    print(f"\nResponse: {text[:200]}...")

    cache_create, cache_read = print_usage("Test 2 Usage", response.usage)

    passed = cache_read > 0
    print(f"\n{'PASS' if passed else 'FAIL'}: Cache read tokens = {cache_read} (expected > 0)")
    return passed


def test_daily_digest_format(client: anthropic.Anthropic) -> bool:
    """Test 3: Daily digest format — checks the assistant uses the correct template."""
    print("\n" + "=" * 60)
    print("TEST 3: Daily digest format check")
    print("=" * 60)

    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[
            {
                "role": "user",
                "content": (
                    "Generate a sample daily digest for Project 2601 (Al Barari Villa) "
                    "for today. Make up realistic data for a luxury villa fit-out in Dubai."
                ),
            }
        ],
    )

    text = response.content[0].text
    print(f"\nResponse:\n{text[:500]}...")

    _, _ = print_usage("Test 3 Usage", response.usage)

    # Check for key sections in the daily digest format
    expected_sections = ["Weather", "Workforce", "Work Completed", "Issues", "Safety"]
    found = [s for s in expected_sections if s.lower() in text.lower()]
    missing = [s for s in expected_sections if s.lower() not in text.lower()]

    passed = len(found) >= 4  # Allow 1 missing section
    print(f"\nFound sections: {found}")
    if missing:
        print(f"Missing sections: {missing}")
    print(f"{'PASS' if passed else 'FAIL'}: {len(found)}/{len(expected_sections)} expected sections found")
    return passed


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: Set ANTHROPIC_API_KEY environment variable")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    results = []

    # Test 1: Basic response (cache write)
    results.append(("Basic response (cache write)", test_basic_response(client)))

    # Brief pause to let cache propagate
    print("\nWaiting 2 seconds for cache propagation...")
    time.sleep(2)

    # Test 2: Cache hit
    results.append(("Cache hit verification", test_cache_hit(client)))

    # Test 3: Daily digest format
    results.append(("Daily digest format", test_daily_digest_format(client)))

    # Summary
    print("\n" + "=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)
    all_passed = True
    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}")
        if not passed:
            all_passed = False

    print(f"\n{'All tests passed!' if all_passed else 'Some tests failed.'}")
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
