"""Autonomous multi-specialist repository auditor using the OpenAI Agents SDK."""

from __future__ import annotations

import os
from pathlib import Path

from agents import Agent, Runner
from agents.run import RunConfig
from agents.sandbox import Manifest, SandboxAgent, SandboxRunConfig
from agents.sandbox.capabilities import Shell
from agents.sandbox.entries import LocalDir
from agents.sandbox.sandboxes.unix_local import UnixLocalSandboxClient

from .prompts import (
    ARCHITECTURE_INSTRUCTIONS,
    LEAD_INSTRUCTIONS,
    PRODUCT_INSTRUCTIONS,
    PRODUCTION_INSTRUCTIONS,
    REPORT_SCHEMA,
    SECURITY_INSTRUCTIONS,
)


def _specialist(name: str, instructions: str, model: str) -> SandboxAgent[None]:
    return SandboxAgent(
        name=name,
        model=model,
        instructions=instructions,
        capabilities=[Shell()],
    )


def build_auditor(repo_dir: Path, model: str | None = None) -> SandboxAgent[None]:
    """Build the lead auditor with four read-only specialist agents."""
    model = model or os.getenv("AUDIT_MODEL", "gpt-5.6-sol")

    security = _specialist("Security Specialist", SECURITY_INSTRUCTIONS, model)
    architecture = _specialist("Architecture Specialist", ARCHITECTURE_INSTRUCTIONS, model)
    product = _specialist("Product UX Specialist", PRODUCT_INSTRUCTIONS, model)
    production = _specialist("Production Specialist", PRODUCTION_INSTRUCTIONS, model)

    lead = SandboxAgent(
        name="Nomad Compass Repository Assurance Lead",
        model=model,
        instructions=LEAD_INSTRUCTIONS + "\n\n" + REPORT_SCHEMA,
        default_manifest=Manifest(entries={"repo": LocalDir(src=repo_dir)}),
        capabilities=[Shell()],
        tools=[
            security.as_tool(
                tool_name="security_audit",
                tool_description="Perform the security and access-control audit against repo/ and return evidence-backed findings.",
            ),
            architecture.as_tool(
                tool_name="architecture_audit",
                tool_description="Map and audit application architecture, data flows, persistence, and integrity risks.",
            ),
            product.as_tool(
                tool_name="product_ux_audit",
                tool_description="Audit nonprofit user workflows and product/UX requirements against implementation.",
            ),
            production.as_tool(
                tool_name="production_audit",
                tool_description="Audit build, deployment, dependency, environment, CI, and operational readiness.",
            ),
        ],
    )
    return lead


async def run_audit(repo_dir: Path, model: str | None = None) -> str:
    """Run the audit against a local checkout and return the final report."""
    repo_dir = repo_dir.resolve()
    if not repo_dir.is_dir():
        raise ValueError(f"Repository directory does not exist: {repo_dir}")

    agent = build_auditor(repo_dir, model=model)
    result = await Runner.run(
        agent,
        (
            "Audit the repository mounted at repo/. Begin with a complete inventory and git identity. "
            "Then call ALL four specialist tools. Reconcile their evidence and produce the final report. "
            "Do not modify any repository file."
        ),
        run_config=RunConfig(
            sandbox=SandboxRunConfig(client=UnixLocalSandboxClient()),
            workflow_name="Nomad Compass repository assurance",
        ),
    )
    return str(result.final_output)
