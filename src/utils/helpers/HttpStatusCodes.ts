export interface HttpStatus {
  code: number;
  message: string;
}

class HttpStatusCodes {
  static OK: HttpStatus = { code: 200, message: 'Requisição bem-sucedida' };
  static CREATED: HttpStatus = {
    code: 201,
    message: 'Recurso criado com sucesso',
  };
  static ACCEPTED: HttpStatus = {
    code: 202,
    message: 'Requisição aceita para processamento',
  };
  static NO_CONTENT: HttpStatus = {
    code: 204,
    message: 'Sem conteúdo para retornar',
  };
  static RESET_CONTENT: HttpStatus = {
    code: 205,
    message: 'Mais dados necessários para processamento',
  };
  static PARTIAL_CONTENT: HttpStatus = {
    code: 206,
    message: 'Conteúdo parcial retornado',
  };
  static MULTI_STATUS: HttpStatus = {
    code: 207,
    message: 'Múltiplos recursos associados à resposta',
  };
  static ALREADY_REPORTED: HttpStatus = {
    code: 208,
    message: 'Conteúdo já relatado',
  };

  static MULTIPLE_CHOICES: HttpStatus = {
    code: 300,
    message: 'Múltiplas respostas disponíveis, cliente deve escolher uma',
  };
  static MOVED_PERMANENTLY: HttpStatus = {
    code: 301,
    message: 'Recurso movido permanentemente para um novo endereço',
  };
  static FOUND: HttpStatus = {
    code: 302,
    message:
      'Recurso encontrado, mas movido temporariamente para um novo endereço',
  };
  static SEE_OTHER: HttpStatus = {
    code: 303,
    message: 'Veja outra referência para o recurso',
  };
  static NOT_MODIFIED: HttpStatus = {
    code: 304,
    message: 'Cliente possui a versão mais recente do recurso',
  };
  static USE_PROXY: HttpStatus = {
    code: 305,
    message: 'Recurso disponível apenas através de um proxy',
  };
  static TEMPORARY_REDIRECT: HttpStatus = {
    code: 307,
    message: 'Recurso temporariamente movido para um novo endereço',
  };
  static PERMANENT_REDIRECT: HttpStatus = {
    code: 308,
    message: 'Recurso movido permanentemente para um novo endereço',
  };

  static BAD_REQUEST: HttpStatus = {
    code: 400,
    message: 'Requisição com sintaxe incorreta',
  };
  static UNAUTHORIZED: HttpStatus = { code: 401, message: 'Não autorizado' };
  static FORBIDDEN: HttpStatus = { code: 403, message: 'Proibido' };
  static NOT_FOUND: HttpStatus = {
    code: 404,
    message: 'Recurso não encontrado',
  };
  static METHOD_NOT_ALLOWED: HttpStatus = {
    code: 405,
    message: 'Método HTTP não permitido para o recurso solicitado',
  };
  static REQUEST_TIMEOUT: HttpStatus = {
    code: 408,
    message: 'Tempo de requisição esgotado',
  };
  static CONFLICT: HttpStatus = {
    code: 409,
    message: 'Conflito com o estado atual do servidor',
  };
  static GONE: HttpStatus = {
    code: 410,
    message: 'Recurso não está mais disponível',
  };
  static PAYLOAD_TOO_LARGE: HttpStatus = {
    code: 413,
    message: 'O corpo da requisição é muito grande',
  };
  static IM_A_TEAPOT: HttpStatus = {
    code: 418,
    message: 'Eu sou um bule de chá',
  };
  static UNPROCESSABLE_ENTITY: HttpStatus = {
    code: 422,
    message: 'Falha na validação',
  };
  static LOCKED: HttpStatus = { code: 423, message: 'Recurso bloqueado' };
  static TOO_MANY_REQUESTS: HttpStatus = {
    code: 429,
    message: 'Limite de requisições excedido',
  };
  static REQUEST_HEADER_FIELDS_TOO_LARGE: HttpStatus = {
    code: 431,
    message: 'Cabeçalhos da requisição são muito grandes',
  };
  static UNAVAILABLE_FOR_LEGAL_REASONS: HttpStatus = {
    code: 451,
    message: 'Acesso negado por motivos legais',
  };
  static INVALID_TOKEN: HttpStatus = {
    code: 498,
    message: 'O token JWT está expirado!',
  };

  static INTERNAL_SERVER_ERROR: HttpStatus = {
    code: 500,
    message: 'Erro interno do servidor',
  };
  static NOT_IMPLEMENTED: HttpStatus = {
    code: 501,
    message: 'Funcionalidade não suportada',
  };
  static BAD_GATEWAY: HttpStatus = {
    code: 502,
    message: 'Resposta inválida recebida do servidor upstream',
  };
  static SERVICE_UNAVAILABLE: HttpStatus = {
    code: 503,
    message: 'Serviço temporariamente indisponível',
  };
}

export default HttpStatusCodes;
