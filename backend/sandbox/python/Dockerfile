# CodeGuard Python sandbox imajı (K5).
#
# Kurmak için (backend klasöründe):
#     docker build -t codeguard-sandbox-python:1 sandbox/python
#
# İmaj bir kalıptır: içinde yalnızca Python ve test araçları vardır. Kullanıcının kodu imaja girmez;
# her çalıştırmada bu imajdan geçici bir kapsayıcı açılır ve kod ona dışarıdan, salt okunur bağlanır.
# Güvenlik kuralları (ağ kapalı, CPU/bellek/süre sınırı, salt okunur dosya sistemi) kapsayıcı
# başlatılırken app/motor/sandbox.py tarafından uygulanır.

# TABAN yalnızca bulut testinde değiştirildi; normalde resmi Python imajı kullanılır.
ARG TABAN=python:3.13-slim
FROM ${TABAN}

# Test araçları (sürümler araclar.txt'de sabit)
COPY araclar.txt /opt/codeguard/araclar.txt
RUN python -m pip install --no-cache-dir --disable-pip-version-check -r /opt/codeguard/araclar.txt

# Bağlama noktaları. 1000 numaralı kullanıcı root değildir; yalnızca kendi klasörlerine yazabilir.
RUN mkdir -p /kaynak /testler /cikti /bagimliliklar /home/sandbox/.cache/pip \
    && chown -R 1000:1000 /cikti /bagimliliklar /home/sandbox

COPY calistir.py /opt/codeguard/calistir.py

ENV HOME=/home/sandbox \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_INPUT=1

USER 1000:1000
WORKDIR /kaynak
ENTRYPOINT ["python", "/opt/codeguard/calistir.py"]
CMD ["test"]
