"""Gerçek test motoru (Faz 3–4).

- sandbox.py: testleri ağı kapalı Docker kapsayıcılarında çalıştırır (K5).
- llm.py: dil modeli katmanı (Gemini ya da sahte model; sınırlar, yeniden deneme, token tavanı).
- birim/: birim ajanı, LangGraph ile Planlayıcı → Test Yazıcı → Doğrulayıcı döngüsü (K6, K9).

Siteye bağlanınca sahte motorun yerine `async def calistir(run_id)` olacak (belge 18 adım 11, belge 21).
"""
