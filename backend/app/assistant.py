
"""Credit-risk assistant with Groq API and built-in fallback."""

import json
from .core import settings


KB = {
    "xgboost": (
        "XGBoost is a machine-learning algorithm based on gradient-boosted "
        "decision trees. It builds trees sequentially, with later trees "
        "correcting errors from earlier trees. This platform uses XGBoost "
        "to estimate bankruptcy risk."
    ),
    "smote": (
        "SMOTE means Synthetic Minority Over-sampling Technique. It creates "
        "synthetic examples of an underrepresented class in training data, "
        "such as bankrupt companies. It can help the model learn from rare "
        "cases, but class balancing can affect probability calibration. "
        "Therefore, the model score should not automatically be treated as "
        "a real-world bankruptcy probability."
    ),
    "shap": (
        "SHAP explains how features contribute to a model prediction. Positive "
        "SHAP values push the prediction toward higher risk, while negative "
        "values push it toward lower risk. SHAP explains model behaviour; "
        "it does not prove causation."
    ),
    "liquidity": (
        "Liquidity describes a company's ability to meet short-term obligations. "
        "It is commonly evaluated using liquid or current assets relative to "
        "current liabilities. Interpretation depends on the industry and "
        "reporting period."
    ),
    "leverage": (
        "Leverage describes how much a company relies on debt relative to "
        "assets or equity. High leverage may increase financial risk because "
        "debt and interest obligations must be paid. Cash flow and industry "
        "context also matter."
    ),
    "bankruptcy": (
        "Bankruptcy risk is an estimate of financial distress, not a guarantee "
        "that a company will fail. Review the source data, model score, missing "
        "data warnings, and SHAP explanation before making decisions."
    ),
    "risk score": (
        "The risk score is the model's predicted probability for its bankruptcy "
        "class. The platform assigns a risk category using configured thresholds. "
        "Unless appropriately calibrated, this score should not be treated as "
        "a real-world default probability."
    ),
    "credit risk": (
        "Credit risk is the possibility that a borrower or company will fail "
        "to meet its financial obligations. This platform uses financial "
        "indicators and an XGBoost model to estimate bankruptcy risk. SHAP "
        "helps explain which features influence a prediction. The result is "
        "decision support, not a guarantee of default."
    ),
    "yahoo": (
        "Yahoo Finance provides financial information for many public companies, "
        "but coverage and statement labels vary. This platform may not derive "
        "all 20 model features from available data. Missing features may be "
        "imputed, so results based on incomplete data are exploratory. "
        "Live financial figures require an available data source."
    ),
}


def _safe_num(value, default=0.0):
    """Convert a value to a number safely."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _fallback(msg, ctx, meta):
    """Answer supported questions without an external AI service."""
    m = msg.lower().strip()
    words = set(m.replace("?", "").replace("!", "").replace(".", "").split())

    # Greetings
    if words and words.issubset({
        "hi", "hello", "hey", "hii", "heyy", "there",
        "good", "morning", "afternoon", "evening"
    }):
        return (
            "Hello! 😊 I'm your credit-risk assistant. Ask me about credit risk, "
            "SHAP, XGBoost, SMOTE, liquidity, leverage, or your assessment."
        )

    # Assessment-specific factors
    if ctx and any(term in m for term in (
        "top risk", "risk factor", "important factor", "risk driver",
        "why is", "explain my assessment"
    )):
        shap_values = ctx.get("shap") or []
        positive = sorted(
            [e for e in shap_values if _safe_num(e.get("shap")) > 0],
            key=lambda e: _safe_num(e.get("shap")),
            reverse=True,
        )[:3]
        negative = sorted(
            [e for e in shap_values if _safe_num(e.get("shap")) < 0],
            key=lambda e: _safe_num(e.get("shap")),
        )[:3]

        if not shap_values:
            return (
                "SHAP contributors are not available for this assessment. "
                "Open the assessment results and check its explanation."
            )

        raised = "; ".join(
            f"{e.get('label') or e.get('feature') or 'Feature'} "
            f"(SHAP {_safe_num(e.get('shap')):+.3f})"
            for e in positive
        ) or "no positive contributors available"

        lowered = "; ".join(
            f"{e.get('label') or e.get('feature') or 'Feature'} "
            f"(SHAP {_safe_num(e.get('shap')):+.3f})"
            for e in negative
        ) or "no negative contributors available"

        company = ctx.get("company_name") or "the selected company"
        probability = _safe_num(ctx.get("probability")) * 100
        risk_level = ctx.get("risk_level") or "not available"

        return (
            f"For {company}, the model score is {probability:.1f}% and the "
            f"configured risk category is {risk_level}. Factors pushing risk "
            f"upward: {raised}. Factors pushing risk downward: {lowered}. "
            "These are model contributions, not proof of causation."
        )

    # Recommendations from the selected assessment
    if ctx and any(term in m for term in (
        "recommend", "improve", "next step", "what should",
        "how to reduce", "how can i reduce"
    )):
        recommendations = ctx.get("recommendations") or []
        if recommendations:
            return "Suggested review areas: " + "; ".join(
                f"{r.get('title') or 'Review area'}: "
                f"{r.get('reason') or 'Verify the financial statements'}"
                for r in recommendations[:5]
            )
        return (
            "No recommendations are attached to this assessment. Review the "
            "financial statements, missing-data warnings, and SHAP contributors."
        )

    # General concept answers
    if "what can you do" in m or "how can you help" in m or m == "help":
        return (
            "I can explain credit risk, SHAP, XGBoost, SMOTE, liquidity, "
            "leverage, risk scores, and assessment results. Try asking "
            "'What is SMOTE?' or 'Explain credit risk.'"
        )

    for key, value in KB.items():
        if key == "risk score":
            if "score" in m or "probability" in m or "risk level" in m:
                return value
        elif key in m:
            return value

    if any(term in m for term in (
        "company", "ticker", "stock", "financial report",
        "financial statement", "yahoo finance"
    )):
        return KB["yahoo"]

    return (
        "I can answer common credit-risk and machine-learning questions "
        "using built-in explanations. For other questions, configure the "
        "Groq API in backend/.env. For company-specific risk factors, "
        "open an assessment with SHAP results."
    )


def answer_with_mode(msg, ctx, meta):
    """Use Groq for conversational answers; fall back safely if unavailable."""
    provider = (settings.AI_PROVIDER or "").strip().lower()
    api_key = (settings.AI_API_KEY or "").strip()
    model = (settings.AI_MODEL or "").strip() or "openai/gpt-oss-120b"

    if provider != "groq" or not api_key:
        return {
            "reply": _fallback(msg, ctx, meta),
            "mode": "fallback",
            "notice": "Built-in assistant mode is active. Configure Groq in backend/.env.",
        }

    try:
        import httpx

        context = (
            json.dumps(ctx, default=str)[:7000]
            if ctx else "No assessment is selected."
        )

        system_prompt = (
            "You are a helpful assistant in an Explainable AI Credit Risk "
            "Assessment application. Answer general questions naturally, "
            "including greetings, programming, AI, machine learning, finance, "
            "and general knowledge. For assessment questions, use only the "
            "supplied context. Never invent company financial figures, live "
            "reports, risk scores, or SHAP values. If information is missing, "
            "say so. SHAP indicates model contribution, not causation.\n"
            "Assessment context:\n" + context
        )

        response = httpx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": msg},
                ],
                "temperature": 0.4,
                "max_tokens": 800,
            },
            timeout=35,
        )
        response.raise_for_status()
        data = response.json()

        choices = data.get("choices") or []
        reply = (
            choices[0].get("message", {}).get("content", "")
            if choices else ""
        )

        if not isinstance(reply, str) or not reply.strip():
            raise ValueError("Groq returned an empty answer.")

        return {
            "reply": reply.strip(),
            "mode": "ai",
            "notice": "AI-generated answer. Verify important financial decisions.",
        }

    except Exception as exc:
        print(f"Groq assistant error: {exc}")
        return {
            "reply": _fallback(msg, ctx, meta),
            "mode": "fallback",
            "notice": (
                "Groq is unavailable. Showing a built-in answer instead. "
                "Check the backend terminal for the error details."
            ),
        }


def answer(msg, ctx, meta):
    """Backward-compatible string-only interface."""
    return answer_with_mode(msg, ctx, meta)["reply"]
