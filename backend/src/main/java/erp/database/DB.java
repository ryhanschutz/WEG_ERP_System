package erp.database;

import java.sql.*;

public class DB {

    private static final String URL = System.getenv("DATABASE_URL");

    private static Connection conn;

    public static Connection get() throws SQLException {
        if (conn == null || conn.isClosed()) {
            conn = DriverManager.getConnection(URL);
            System.out.println("[DB] Conexão com Neon PostgreSQL estabelecida.");
        }
        return conn;
    }

    // ── Grava evento de produção ──────────────────────────────────────────────
    public static void gravarEvento(String maquinaCod, Integer ordemId,
                                     String evento, int pecas,
                                     int temp, String autor) {
        String sql = """
            INSERT INTO producao (maquina_cod, ordem_id, evento, pecas_boas, temperatura, autor)
            VALUES (?, ?, ?, ?, ?, ?)
            """;
        try (PreparedStatement ps = get().prepareStatement(sql)) {
            ps.setString(1, maquinaCod);
            if (ordemId != null) ps.setInt(2, ordemId); else ps.setNull(2, Types.INTEGER);
            ps.setString(3, evento);
            ps.setInt(4, pecas);
            ps.setInt(5, temp);
            ps.setString(6, autor);
            ps.executeUpdate();
        } catch (SQLException e) {
            System.err.println("[DB] Erro ao gravar evento: " + e.getMessage());
        }
    }

    // ── Atualiza status e temperatura da máquina ──────────────────────────────
    public static void atualizarMaquina(String cod, String status, int temp) {
        String sql = "UPDATE maquinas SET status = ?, temperatura = ? WHERE codigo = ?";
        try (PreparedStatement ps = get().prepareStatement(sql)) {
            ps.setString(1, status);
            ps.setInt(2, temp);
            ps.setString(3, cod);
            ps.executeUpdate();
        } catch (SQLException e) {
            System.err.println("[DB] Erro ao atualizar máquina: " + e.getMessage());
        }
    }

    // ── Atualiza peças boas da máquina (SET, não soma) ────────────────────────
    // O ESP32 envia o total acumulado, então usamos SET em vez de += 
    public static void atualizarPecasMaquina(String cod, int pecasTotal) {
        String sql = """
            UPDATE maquinas
            SET pecas_boas = ?, atualizado_em = now()
            WHERE codigo = ?
            """;
        try (PreparedStatement ps = get().prepareStatement(sql)) {
            ps.setInt(1, pecasTotal);
            ps.setString(2, cod);
            ps.executeUpdate();
        } catch (SQLException e) {
            System.err.println("[DB] Erro ao atualizar peças da máquina: " + e.getMessage());
        }
    }

    // ── Grava alerta ──────────────────────────────────────────────────────────
    public static void gravarAlerta(String tipo, String mensagem,
                                     String maquinaCod, String autor) {
        String sql = """
            INSERT INTO alertas (tipo, mensagem, maquina_cod, autor)
            VALUES (?, ?, ?, ?)
            """;
        try (PreparedStatement ps = get().prepareStatement(sql)) {
            ps.setString(1, tipo);
            ps.setString(2, mensagem);
            ps.setString(3, maquinaCod);
            ps.setString(4, autor);
            ps.executeUpdate();
        } catch (SQLException e) {
            System.err.println("[DB] Erro ao gravar alerta: " + e.getMessage());
        }
    }

    // ── Incrementa estoque ao encerrar ordem ──────────────────────────────────
    public static void incrementarEstoque(String produto, int quantidade) {
        String sql = """
            UPDATE estoque
            SET quantidade = quantidade + ?, atualizado_em = now()
            WHERE produto = ?
            """;
        try (PreparedStatement ps = get().prepareStatement(sql)) {
            ps.setInt(1, quantidade);
            ps.setString(2, produto);
            ps.executeUpdate();
        } catch (SQLException e) {
            System.err.println("[DB] Erro ao atualizar estoque: " + e.getMessage());
        }
    }
}