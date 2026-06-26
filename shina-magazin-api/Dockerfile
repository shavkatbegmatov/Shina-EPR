# Backend (Spring Boot, JDK 21) — Coolify Dockerfile deploy.
# Build: Maven; Run: JRE 21. Prod profil + lokal storage /data/uploads (Coolify volume).

# --- Build ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B -ntp -DskipTests clean package

# --- Run ---
FROM eclipse-temurin:21-jre AS run
WORKDIR /app
# Yuklangan mahsulot rasmlari papkasi — Coolify PERSISTENT VOLUME shu yerga mount qilinadi
# (aks holda har deploy'da rasmlar yo'qoladi).
RUN mkdir -p /data/uploads
ENV SPRING_PROFILES_ACTIVE=prod \
    SHOP_STORAGE_DIR=/data/uploads
COPY --from=build /app/target/shina_magazin_api.jar app.jar
EXPOSE 8183
ENTRYPOINT ["java", "-jar", "app.jar"]
