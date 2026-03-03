package erp.model;

public class Evento {
    public String maquina_id;
    public String evento;      // iniciada, pausada, encerrada, peca_registrada, temperatura
    public int    pecas_boas;
    public int    temperatura;
    public String autor;

    @Override
    public String toString() {
        return "[" + maquina_id + "] " + evento +
               " | peças=" + pecas_boas +
               " | temp=" + temperatura +
               " | autor=" + autor;
    }
}