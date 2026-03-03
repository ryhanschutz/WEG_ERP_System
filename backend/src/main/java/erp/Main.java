package erp;

import erp.api.ApiServer;
import erp.mqtt.MqttService;

public class Main {
    public static void main(String[] args) {
        System.out.println("=== ERP Backend iniciando ===");

        // 1. Inicia API REST
        ApiServer.iniciar();

        // 2. Conecta ao broker MQTT
        try {
            MqttService.conectar();
        } catch (Exception e) {
            System.err.println("[MQTT] Falha na conexão: " + e.getMessage());
            System.err.println("[MQTT] API REST continua funcionando sem MQTT.");
        }

        System.out.println("=== Sistema pronto ===");
    }
}