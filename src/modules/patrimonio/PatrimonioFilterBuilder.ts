import mongoose from 'mongoose';
import { escapeRegex } from '../../utils/helpers/escapeRegex.js';

const { Types } = mongoose;

class PatrimonioFilterBuilder {
  filtros: Record<string, unknown> = {};

  constructor() {
    this.filtros = {};
  }

  comItem(item: string | null | undefined): this {
    if (item && Types.ObjectId.isValid(item)) {
      this.filtros['item'] = new Types.ObjectId(item);
    }
    return this;
  }

  comStatus(status: string | null | undefined): this {
    if (
      status &&
      ['Disponível', 'Emprestado', 'Manutenção', 'Baixado'].includes(status)
    ) {
      this.filtros['status'] = status;
    }
    return this;
  }

  comLocalizacao(localizacao: string | null | undefined): this {
    if (localizacao && Types.ObjectId.isValid(localizacao)) {
      this.filtros['localizacao'] = new Types.ObjectId(localizacao);
    }
    return this;
  }

  comNumeroPatrimonio(numeroPatrimonio: string | null | undefined): this {
    if (numeroPatrimonio) {
      this.filtros['numero_patrimonio'] = {
        $regex: escapeRegex(numeroPatrimonio),
        $options: 'i',
      };
    }
    return this;
  }

  // Busca só por número de patrimônio. Buscar também pelo nome do item
  // populado exigiria um lookup contra `itens` antes de montar o filtro
  // (como `ItemFilterBuilder.comCategoria` faz para categoria) — deixado de
  // fora para não sobre-engenhar um filtro que a tela ainda não pede; o
  // nome do modelo já filtra por `item` diretamente.
  comBusca(busca: string | null | undefined): this {
    return this.comNumeroPatrimonio(busca);
  }

  comAtivo(ativo = 'true'): this {
    if (ativo === 'true') {
      this.filtros['ativo'] = true;
    }
    if (ativo === 'false') {
      this.filtros['ativo'] = false;
    }
    return this;
  }

  build(): Record<string, unknown> {
    return this.filtros;
  }
}

export default PatrimonioFilterBuilder;
