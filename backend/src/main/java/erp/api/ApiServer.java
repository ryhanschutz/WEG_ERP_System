package erp.api;

import com.google.gson.Gson;
import erp.database.DB;
import erp.mqtt.MqttService;
import io.javalin.Javalin;

import java.sql.*;
import java.util.*;

public class ApiServer {

    private static final Gson gson = new Gson();

    public static void iniciar() {
        Javalin app = Javalin.create(cfg -> {
            cfg.bundledPlugins.enableCors(cors ->
                cors.addRule(it -> it.anyHost())  // permite o React acessar
            );
        }).start(8080);

        System.out.println("[API] Servidor rodando na porta 8080");

        // ── GET /api/maquinas ─────────────────────────────────────────────────
        app.get("/api/maquinas", ctx -> {
            List<Map<String, Object>> result = new ArrayList<>();
            String sql = "SELECT codigo, nome, status, temperatura, meta_diaria FROM maquinas WHERE ativa = true";
            try (Statement st = DB.get().createStatement();
                 ResultSet rs = st.executeQuery(sql)) {
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id",          rs.getString("codigo"));
                    row.put("nome",        rs.getString("nome"));
                    row.put("status",      rs.getString("status"));
                    row.put("temperatura", rs.getInt("temperatura"));
                    row.put("meta",        rs.getInt("meta_diaria"));
                    result.add(row);
                }
            }
            ctx.json(result);
        });

        // ── GET /api/ordens ───────────────────────────────────────────────────
        app.get("/api/ordens", ctx -> {
            List<Map<String, Object>> result = new ArrayList<>();
            String sql = "SELECT id, produto, quantidade, maquina_cod, prioridade, status, autor, criado_em FROM ordens ORDER BY id DESC";
            try (Statement st = DB.get().createStatement();
                 ResultSet rs = st.executeQuery(sql)) {
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id",         rs.getInt("id"));
                    row.put("produto",    rs.getString("produto"));
                    row.put("quantidade", rs.getInt("quantidade"));
                    row.put("maquina",    rs.getString("maquina_cod"));
                    row.put("prioridade", rs.getString("prioridade"));
                    row.put("status",     rs.getString("status"));
                    row.put("autor",      rs.getString("autor"));
                    row.put("ts",         rs.getTimestamp("criado_em").toLocalDateTime()
                                            .toLocalTime().toString().substring(0, 8));
                    result.add(row);
                }
            } catch (SQLException e) {
                System.err.println("[API] Erro ao buscar ordens: " + e.getMessage());
                e.printStackTrace();
            }
            ctx.json(result);
        });

        // ── POST /api/ordens ──────────────────────────────────────────────────
        app.post("/api/ordens", ctx -> {
            try {
                Map body = gson.fromJson(ctx.body(), Map.class);
                String sql = """
                    INSERT INTO ordens (produto, quantidade, maquina_cod, prioridade, autor)
                    VALUES (?, ?, ?, ?, ?) RETURNING id
                    """;
                try (PreparedStatement ps = DB.get().prepareStatement(sql)) {
                    ps.setString(1, (String) body.get("produto"));
                    ps.setInt(2,    ((Double) body.get("quantidade")).intValue());
                    ps.setString(3, (String) body.get("maquina"));
                    ps.setString(4, (String) body.get("prioridade"));
                    ps.setString(5, (String) body.get("autor"));
                    ResultSet rs = ps.executeQuery();
                    if (rs.next()) {
                        int orderId = rs.getInt("id");
                        System.out.println("[API] Ordem #" + orderId + " criada com sucesso.");
                        ctx.json(Map.of("id", orderId, "status", "criada"));
                    }
                } catch (SQLException e) {
                    System.err.println("[API] Erro ao inserir ordem: " + e.getMessage());
                    e.printStackTrace();
                    ctx.status(500).json(Map.of("erro", "Erro ao salvar ordem: " + e.getMessage()));
                }
            } catch (Exception e) {
                System.err.println("[API] Erro geral no POST /api/ordens: " + e.getMessage());
                e.printStackTrace();
                ctx.status(500).json(Map.of("erro", e.getMessage()));
            }
        });

        // ── POST /api/comandos ────────────────────────────────────────────────
        // Recebe do frontend e publica no MQTT → ESP32
        app.post("/api/comandos", ctx -> {
            Map body = gson.fromJson(ctx.body(), Map.class);
            String maquina = (String) body.get("maquina_id");
            String comando = (String) body.get("comando");
            String autor   = (String) body.get("autor");

            // Publica no MQTT para o ESP32
            String payload = String.format(
                "{\"maquina_id\":\"%s\",\"comando\":\"%s\",\"autor\":\"%s\"}",
                maquina, comando, autor
            );
            MqttService.publicarComando(payload);

            // Grava no banco
            DB.gravarAlerta("info",
                "[" + autor + "] Comando '" + comando + "' enviado → " + maquina,
                maquina, autor);

            ctx.json(Map.of("status", "enviado", "payload", payload));
        });

        // ── GET /api/estoque ──────────────────────────────────────────────────
        app.get("/api/estoque", ctx -> {
            List<Map<String, Object>> result = new ArrayList<>();
            String sql = "SELECT id, produto, quantidade, minimo FROM estoque ORDER BY id";
            try (Statement st = DB.get().createStatement();
                 ResultSet rs = st.executeQuery(sql)) {
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id",         rs.getInt("id"));
                    row.put("produto",    rs.getString("produto"));
                    row.put("quantidade", rs.getInt("quantidade"));
                    row.put("minimo",     rs.getInt("minimo"));
                    result.add(row);
                }
            }
            ctx.json(result);
        });

        // ── GET /api/alertas ──────────────────────────────────────────────────
        app.get("/api/alertas", ctx -> {
            List<Map<String, Object>> result = new ArrayList<>();
            String sql = "SELECT id, tipo, mensagem, autor, criado_em FROM alertas ORDER BY id DESC LIMIT 30";
            try (Statement st = DB.get().createStatement();
                 ResultSet rs = st.executeQuery(sql)) {
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id",   rs.getInt("id"));
                    row.put("tipo", rs.getString("tipo"));
                    row.put("msg",  rs.getString("mensagem"));
                    row.put("autor",rs.getString("autor"));
                    row.put("ts",   rs.getTimestamp("criado_em").toLocalDateTime()
                                      .toLocalTime().toString().substring(0, 8));
                    result.add(row);
                }
            }
            ctx.json(result);
        });

        // ── GET /api/plm ──────────────────────────────────────────────────────
        app.get("/api/plm", ctx -> {
            List<Map<String, Object>> result = new ArrayList<>();
            String sql = """
                SELECT p.codigo, p.nome, p.material, p.peso, p.tolerancia,
                       p.responsavel, p.revisao,
                       f.id as fase_id, f.nome_fase, f.status, f.responsavel as fase_resp,
                       f.observacao, f.data_conclusao, f.alterado_por
                FROM produtos p
                JOIN plm_fases f ON f.produto_cod = p.codigo
                ORDER BY p.codigo, f.id
                """;
            try (Statement st = DB.get().createStatement();
                 ResultSet rs = st.executeQuery(sql)) {
                Map<String, Map<String, Object>> produtos = new LinkedHashMap<>();
                while (rs.next()) {
                    String cod = rs.getString("codigo");
                    if (!produtos.containsKey(cod)) {
                        Map<String, Object> prod = new LinkedHashMap<>();
                        prod.put("id",          cod);
                        prod.put("nome",         rs.getString("nome"));
                        prod.put("material",     rs.getString("material"));
                        prod.put("peso",         rs.getString("peso"));
                        prod.put("tolerancia",   rs.getString("tolerancia"));
                        prod.put("responsavel",  rs.getString("responsavel"));
                        prod.put("revisao",      rs.getString("revisao"));
                        prod.put("fases",        new ArrayList<>());
                        produtos.put(cod, prod);
                    }
                    Map<String, Object> fase = new LinkedHashMap<>();
                    fase.put("id",           rs.getInt("fase_id"));
                    fase.put("nome",         rs.getString("nome_fase"));
                    fase.put("status",       rs.getString("status"));
                    fase.put("responsavel",  rs.getString("fase_resp") != null ? rs.getString("fase_resp") : "—");
                    fase.put("obs",          rs.getString("observacao") != null ? rs.getString("observacao") : "");
                    fase.put("data",         rs.getDate("data_conclusao") != null
                                               ? rs.getDate("data_conclusao").toString() : "—");
                    ((List) produtos.get(cod).get("fases")).add(fase);
                }
                result.addAll(produtos.values());
            }
            ctx.json(result);
        });

        // ── PATCH /api/plm/fase/:id ───────────────────────────────────────────
        app.patch("/api/plm/fase/{id}", ctx -> {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Map body = gson.fromJson(ctx.body(), Map.class);
            String sql = """
                UPDATE plm_fases
                SET status = ?, observacao = ?, alterado_por = ?, atualizado_em = now()
                WHERE id = ?
                """;
            try (PreparedStatement ps = DB.get().prepareStatement(sql)) {
                ps.setString(1, (String) body.get("status"));
                ps.setString(2, (String) body.get("observacao"));
                ps.setString(3, (String) body.get("alterado_por"));
                ps.setInt(4, id);
                ps.executeUpdate();
            }
            ctx.json(Map.of("status", "atualizado"));
        });

        // ── POST /api/login ───────────────────────────────────────────────────
        app.post("/api/login", ctx -> {
            Map body = gson.fromJson(ctx.body(), Map.class);
            String sql = "SELECT id, nome, perfil FROM usuarios WHERE usuario = ? AND senha = ?";
            try (PreparedStatement ps = DB.get().prepareStatement(sql)) {
                ps.setString(1, (String) body.get("usuario"));
                ps.setString(2, (String) body.get("senha"));
                ResultSet rs = ps.executeQuery();
                if (rs.next()) {
                    ctx.json(Map.of(
                        "ok",      true,
                        "nome",    rs.getString("nome"),
                        "perfil",  rs.getString("perfil"),
                        "usuario", body.get("usuario")
                    ));
                } else {
                    ctx.status(401).json(Map.of("ok", false, "erro", "Usuário ou senha incorretos."));
                }
            }
        });
    }
}