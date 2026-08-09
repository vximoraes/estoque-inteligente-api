import NotificacaoModel from './NotificacaoModel.js';
import NotificacaoRepository from './NotificacaoRepository.js';

class NotificacaoFilterBuilder {
  private filtros: Record<string, unknown> = {};
  notificacaoRepository: NotificacaoRepository;
  notificacaoModel: typeof NotificacaoModel;

  constructor() {
    this.notificacaoRepository = new NotificacaoRepository();
    this.notificacaoModel = NotificacaoModel;
  }

  comUsuario(usuarioId: string | undefined): this {
    if (usuarioId) {
      this.filtros['usuario'] = usuarioId;
    }
    return this;
  }

  comDataInicial(dataInicial: string | undefined): this {
    if (dataInicial) {
      const dataCriacao =
        (this.filtros['dataCriacao'] as Record<string, Date>) ?? {};
      dataCriacao['$gte'] = new Date(dataInicial);
      this.filtros['dataCriacao'] = dataCriacao;
    }
    return this;
  }

  comDataFinal(dataFinal: string | undefined): this {
    if (dataFinal) {
      const dataCriacao =
        (this.filtros['dataCriacao'] as Record<string, Date>) ?? {};
      dataCriacao['$lte'] = new Date(dataFinal);
      this.filtros['dataCriacao'] = dataCriacao;
    }
    return this;
  }

  comVisualizada(visualizada: string | boolean | undefined): this {
    if (visualizada !== undefined) {
      this.filtros['visualizada'] = visualizada === 'true';
    }
    return this;
  }

  build(): Record<string, unknown> {
    return this.filtros;
  }
}

export default NotificacaoFilterBuilder;
