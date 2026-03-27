"""Integration tests for rule parsing via Bedrock.

These tests call the actual Bedrock API to verify the LLM produces valid rules.
"""
from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from rule_parser import RuleParser


@pytest.fixture
def parser():
    return RuleParser()


@pytest.mark.asyncio
class TestRuleParserBedrock:
    async def test_simple_person_detection(self, parser):
        """'Alert if a person is detected' should produce an object_present rule."""
        rule = await parser.parse("Alert me if a person is detected", [])
        assert rule is not None, "Parser returned None -- Bedrock call likely failed"
        assert rule.name, "Rule should have a name"
        assert len(rule.conditions) >= 1
        # Should contain an object_present condition for person
        types = [c.type for c in rule.conditions]
        assert "object_present" in types, f"Expected object_present, got {types}"
        person_cond = next(c for c in rule.conditions if c.type == "object_present")
        assert person_cond.params.get("class") == "person"

    async def test_zone_aware_rule(self, parser):
        """Rule mentioning a zone should use object_in_zone."""
        rule = await parser.parse(
            "Alert if a person enters the Kitchen",
            ["Kitchen", "Front Door"],
        )
        assert rule is not None
        types = [c.type for c in rule.conditions]
        assert "object_in_zone" in types, f"Expected object_in_zone, got {types}"

    async def test_count_rule(self, parser):
        """Rule about number of people should produce a count condition."""
        rule = await parser.parse("Alert if more than 3 people are in the room", [])
        assert rule is not None
        types = [c.type for c in rule.conditions]
        assert "count" in types, f"Expected count condition, got {types}"
        count_cond = next(c for c in rule.conditions if c.type == "count")
        assert count_cond.params.get("value") in (3, 4)  # LLM may use gt 3 or gte 4

    async def test_severity_assignment(self, parser):
        """Critical-sounding rules should get high/critical severity."""
        rule = await parser.parse(
            "Alert immediately if a person falls down - this is an emergency",
            [],
        )
        assert rule is not None
        assert rule.severity in ("high", "critical"), f"Expected high/critical, got {rule.severity}"

    async def test_invalid_input_handled(self, parser):
        """Nonsense input should still return a rule or None, not crash."""
        rule = await parser.parse("asdfghjkl random gibberish 12345", [])
        # Either returns a best-effort rule or None, but must not raise
        if rule is not None:
            assert rule.name
