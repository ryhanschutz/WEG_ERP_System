package erp.mqtt;

import com.google.gson.Gson;
import erp.database.DB;
import erp.model.Evento;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;

public class MqttService {

    // ── Credenciais HiveMQ Cloud — substitua pelas suas ──────────────────────
    private static final String BROKER   = System.getenv("MQTT_BROKER");
    // Formato: ssl://xxxxxxxx.s1.eu.hivemq.cloud:8883
    private static final String USER     = System.getenv("MQTT_USER");
    private static final String PASSWORD = System.getenv("MQTT_PASS");
    private static final String CLIENT_ID = "erp-backend-" + System.currentTimeMillis();

    // Tópicos
    public static final String TOPIC_EVENTOS   = "fabrica/eventos";   // ESP32 → Java
    public static final String TOPIC_COMANDOS  = "fabrica/comandos";  // Java → ESP32

    private static MqttClient client;
    private static final Gson gson = new Gson();

    public static void conectar() throws MqttException {
        client = new MqttClient(BROKER, CLIENT_ID, new MemoryPersistence());

        MqttConnectOptions opts = new MqttConnectOptions();
        opts.setUserName(USER);
        opts.setPassword(PASSWORD.toCharArray());
        opts.setCleanSession(true);
        opts.setAutomaticReconnect(true);
        opts.setConnectionTimeout(10);

        client.connect(opts);
        System.out.println("[MQTT] Conectado ao broker: " + BROKER);

        // Escuta eventos vindos do ESP32
        client.subscribe(TOPIC_EVENTOS, 1, (topic, msg) -> {
            String payload = new String(msg.getPayload());
            System.out.println("[MQTT] Recebido: " + payload);
            processarEvento(payload);
        });
    }

    // ── Publica comando para o ESP32 ──────────────────────────────────────────
    public static void publicarComando(String json) {
        try {
            MqttMessage msg = new MqttMessage(json.getBytes());
            msg.setQos(1);
            client.publish(TOPIC_COMANDOS, msg);
            System.out.println("[MQTT] Comando publicado: " + json);
        } catch (MqttException e) {
            System.err.println("[MQTT] Erro ao publicar: " + e.getMessage());
        }
    }

    // ── Processa evento recebido do ESP32 ─────────────────────────────────────
    private static void processarEvento(String payload) {
        try {
            Evento e = gson.fromJson(payload, Evento.class);
            System.out.println("[MQTT] Processando: " + e);

            // 1. Atualiza status da máquina no banco
            String novoStatus = switch (e.evento) {
                case "iniciada"         -> "produzindo";
                case "pausada"          -> "pausada";
                case "encerrada"        -> "concluida";
                case "peca_registrada"  -> "produzindo";   // evento extra vindo do ESP32
                default                 -> "idle";
            };
            DB.atualizarMaquina(e.maquina_id, novoStatus, e.temperatura);

            // 2. Grava o evento na tabela producao
            DB.gravarEvento(e.maquina_id, null, e.evento, e.pecas_boas, e.temperatura, e.autor);

            // 3. Se for registro de peça, incrementa contador da máquina
            if ("peca_registrada".equals(e.evento) && e.pecas_boas > 0) {
                DB.incrementarPecasMaquina(e.maquina_id, e.pecas_boas);
            }

            // 4. Lógica de alertas
            if (e.temperatura > 75) {
                String msg = e.maquina_id + " — Temperatura elevada: " + e.temperatura + " °C";
                DB.gravarAlerta("warning", msg, e.maquina_id, "sistema");
                System.out.println("[ALERTA] " + msg);
            }

            // 4. Se ordem concluída, incrementa estoque (simplificado)
            if ("encerrada".equals(e.evento) && e.pecas_boas > 0) {
                DB.incrementarEstoque("Peça Tipo A", e.pecas_boas);
                DB.gravarAlerta("info",
                    e.maquina_id + " — Ordem encerrada. " + e.pecas_boas + " peças no estoque.",
                    e.maquina_id, "sistema");
            }

        } catch (Exception ex) {
            System.err.println("[MQTT] Erro ao processar evento: " + ex.getMessage());
        }
    }
}