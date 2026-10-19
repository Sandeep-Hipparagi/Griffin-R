"""
schema.py
Pydantic State Schema & Form Model for LiveKit Voice Technical Interviewer.
"""

from typing import Optional, List, Dict, Any
import re
from pydantic import BaseModel, Field


class ApplicationForm(BaseModel):
    """
    Target Application Form collected during the technical interview.
    Contains core project details, individual ownership breakdown,
    and quantifiable impact metrics.
    """
    project_name: Optional[str] = Field(
        default=None,
        description="Name and concise summary of what was built."
    )
    personal_ownership: Optional[str] = Field(
        default=None,
        description="Specific components, architecture, or logic personally coded, designed, or owned by the candidate (avoiding collective 'we')."
    )
    impact_metrics: Optional[str] = Field(
        default=None,
        description="Quantifiable outcomes, user scale, latency reductions, throughput, test coverage, or commercial impact numbers."
    )
    ready_for_review: bool = Field(
        default=False,
        description="Flag indicating all fields are thoroughly validated with concrete metrics and clear individual ownership."
    )

    def missing_fields(self) -> List[str]:
        """Returns the list of fields that are still missing or incomplete."""
        missing = []
        if not self.project_name or len(self.project_name.strip()) < 3:
            missing.append("project_name")
        if not self.personal_ownership or not self.is_ownership_sufficient(self.personal_ownership):
            missing.append("personal_ownership")
        if not self.impact_metrics or not self.is_metrics_sufficient(self.impact_metrics):
            missing.append("impact_metrics")
        return missing

    def is_complete(self) -> bool:
        """Returns True if all required fields are populated and ready for review."""
        return len(self.missing_fields()) == 0 and self.ready_for_review

    @staticmethod
    def is_ownership_sufficient(ownership_text: Optional[str]) -> bool:
        """
        Validates if ownership text clearly distinguishes individual role
        from collective team participation.
        Must explicitly include first-person ownership (I, my, mine, myself, personally, solely)
        and rejects collective 'we'/'our team' statements unless personal contribution is explicit.
        """
        if not ownership_text:
            return False
        cleaned = ownership_text.strip()
        if len(cleaned) < 10 or len(cleaned.split()) < 4:
            return False

        lower = cleaned.lower()
        has_first_person = bool(re.search(r"\b(i|my|mine|myself|personally|solely)\b", lower))
        has_collective = bool(re.search(r"\b(we|our|team|group|company|us)\b", lower))

        # Reject if solely collective without individual first-person attribution
        if has_collective and not has_first_person:
            return False

        return has_first_person

    @staticmethod
    def is_metrics_sufficient(metrics_text: Optional[str]) -> bool:
        """
        Validates if metrics text contains numbers, percentages, or measurable scale.
        Must contain actual numerical digits or quantified scale (e.g. 40%, 10x, 500ms, 10k, $5M).
        """
        if not metrics_text:
            return False
        cleaned = metrics_text.strip()
        if len(cleaned) < 4:
            return False

        has_digits = bool(re.search(r"\d+", cleaned))
        has_spelled_quant = bool(
            re.search(
                r"\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|billion)\s+(percent|users|requests|customers|ms|x|qps|rps|seconds)\b",
                cleaned.lower(),
            )
        )
        return has_digits or has_spelled_quant

    def update_fields(
        self,
        project_name: Optional[str] = None,
        personal_ownership: Optional[str] = None,
        impact_metrics: Optional[str] = None,
        ready_for_review: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """
        Updates the form fields, automatically verifying readiness if all criteria are satisfied.
        """
        updated: Dict[str, Any] = {}
        if project_name and project_name.strip():
            self.project_name = project_name.strip()
            updated["project_name"] = self.project_name
        if personal_ownership and personal_ownership.strip():
            self.personal_ownership = personal_ownership.strip()
            updated["personal_ownership"] = self.personal_ownership
        if impact_metrics and impact_metrics.strip():
            self.impact_metrics = impact_metrics.strip()
            updated["impact_metrics"] = self.impact_metrics

        if ready_for_review is not None:
            self.ready_for_review = ready_for_review
        elif len(self.missing_fields()) == 0:
            self.ready_for_review = True

        return updated

    def to_draft_json(self, indent: int = 2) -> str:
        """Serializes current application form into structured Pydantic JSON draft."""
        return self.model_dump_json(indent=indent)

    def summary(self) -> str:
        """Returns a formatted representation of the current state."""
        return (
            f"Project: {self.project_name or 'Not provided'}\n"
            f"Personal Ownership: {self.personal_ownership or 'Not provided'}\n"
            f"Impact Metrics: {self.impact_metrics or 'Not provided'}\n"
            f"Ready for Review: {'Yes' if self.ready_for_review else 'No'}"
        )


class InterviewStateUpdate(BaseModel):
    """
    Schema used for tool/function calling or structured extraction during the interview.
    """
    project_name: Optional[str] = Field(
        default=None,
        description="Updated project name and summary if clarified or mentioned."
    )
    personal_ownership: Optional[str] = Field(
        default=None,
        description="Updated personal ownership details if candidate specified their exact code/contributions."
    )
    impact_metrics: Optional[str] = Field(
        default=None,
        description="Updated quantitative impact metrics if candidate provided numbers, scale, or metrics."
    )
    ready_for_review: Optional[bool] = Field(
        default=None,
        description="Mark as True only when all three fields (project, ownership, metrics) are verified with solid evidence."
    )


def extract_form_update_with_instructor(
    transcript: str,
    client: Optional[Any] = None,
    model: str = "gpt-4o-mini",
) -> InterviewStateUpdate:
    """
    Extracts structured form updates from interview dialogue using Instructor and Pydantic.
    Safely catches exceptions and returns an empty update on failure.
    """
    import os
    import logging

    log = logging.getLogger("schema-extraction")
    if not transcript or not transcript.strip():
        return InterviewStateUpdate()

    try:
        if client is None:
            import instructor
            from openai import OpenAI

            api_key = os.getenv("OPENAI_API_KEY")
            base_url = os.getenv("OPENAI_BASE_URL")
            if not api_key:
                return InterviewStateUpdate()
            client = instructor.from_openai(OpenAI(api_key=api_key, base_url=base_url))

        return client.chat.completions.create(
            model=model,
            response_model=InterviewStateUpdate,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Extract structured updates for a technical interview form. "
                        "Only extract personal_ownership if individual contribution is specified (not collective 'we'). "
                        "Only extract impact_metrics if concrete numbers or measurable metrics are present."
                    ),
                },
                {"role": "user", "content": transcript},
            ],
        )
    except Exception as exc:
        log.warning(f"Instructor extraction encountered error: {exc}")
        return InterviewStateUpdate()


