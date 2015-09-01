'use strict';

var modelos = require('modelos');
var validacoes = require('validacoes');

function quote(str) {
  str = _.trim(str);
  return str ? '"' + str + '"' : '';
}

function itIsMandatory(campo, fn) {
  it('campo ' + quote(campo) + ' obrigatório', function () {
    expect(fn('12345')).toBeUndefined();
    expect(fn()).toBe('erro-campo-obrigatorio');
    expect(fn('')).toBe('erro-campo-obrigatorio');
  });
}

function shouldBePresent(campo, context) {
  it('campo ' + quote(campo) + ' deve ser obrigatório', function () {
    var prop = context();

    prop(null);
    expect(prop.erro()).toBe('erro-campo-obrigatorio');

    prop('algum valor');
    expect(prop.erro()).toBeUndefined();
  });
}

function itShouldMax(campo, fn, limite) {
  var noLimite = _.repeat('x', limite);
  var alemDoLimite = _.repeat('c', limite + 1);

  it('campo ' + quote(campo) + ' não pode ultrapassar ' + limite + ' caracteres', function () {
    expect(fn(noLimite)).toBeUndefined();
    expect(fn(alemDoLimite)).toBe('erro-max-' + limite);
  });
}

function shouldNotExceed(campo, context, limite) {

  it('campo ' + quote(campo) + ' não pode ultrapassar ' + limite + ' caracteres', function () {
    var property = context();

    property(_.repeat('a', limite + 1));
    expect(property.erro()).toBe('erro-max-' + limite);
  });

  it('campo ' + quote(campo) + ' deve aceitar valores com tamanho até ' + limite + ' caracteres', function () {
    var property = context();

    property(_.repeat('b', limite));
    expect(property.erro()).toBeUndefined();
  });

}

function itShouldBeNumeric(campo, fn) {
  it(quote(campo) + ' deve aceitar ponto', function () {
    expect(fn('1.000.000')).toBeUndefined();
  });
  it(quote(campo) + ' deve aceitar virgula', function () {
    expect(fn('999,99')).toBeUndefined();
  });
  it(quote(campo) + ' deve aceitar apenas números', function () {
    expect(fn('1234567890')).toBeUndefined();
    expect(fn('a1234')).toBe('erro-campo-numerico');
    expect(fn('abc')).toBe('erro-campo-numerico');
    expect(fn('123-456')).toBe('erro-campo-numerico');
  });

}

function itemsShouldMax(campo, fn, limite, fnCampos) {
  fnCampos = fnCampos || _.identity;
  var param = [_.repeat('x', limite), _.repeat('c', limite + 1)];
  it('campo ' + quote(campo) + ' não pode ultrapassar ' + limite + ' caracteres', function () {
    var erros = fnCampos(fn(param));
    expect(erros[0]).toBeUndefined();
    expect(erros[1]).toBe('erro-max-' + limite);
  });
}

function novoCaso(campos) {
  return new modelos.Caso('', {
    descricao: _.repeat('a', 151),
    campos: campos
  });
}

function itIsCaso(Classe, validadorCaso, validadorCampo) {
  var caso;

  beforeEach(function () {
    spyOn(validadorCampo, 'campo')
      .and.returnValue('validou');

    caso = new Classe({
      casoPadrao: novoCaso([1, 2]),
      outrosCasos: [novoCaso([]), novoCaso([3]), novoCaso([4, 5, 6])]
    });
  });

  it('', function () {
    var ret = validadorCaso(caso);
    expect(ret).toEqual({
      casoPadrao: {
        descricao: 'erro-max-150',
        campos: ['validou', 'validou']
      },
      outrosCasos: [
        {
          descricao: 'erro-max-150',
          campos: []
        }, {
          descricao: 'erro-max-150',
          campos: ['validou']
        }, {
          descricao: 'erro-max-150',
          campos: ['validou', 'validou', 'validou']
        }
      ]
    });

    _.range(1, 7).forEach(function (n) {
      expect(validadorCampo.campo).toHaveBeenCalledWith(n, jasmine.anything(), jasmine.anything());
    });
  });
}

describe('validação >', function () {

  describe('servico >', function () {

    var servico;

    beforeEach(function () {
      servico = new modelos.Servico();
    });

    shouldBePresent('nome', function () { return servico.nome; });
    shouldBePresent('descricao', function () { return servico.descricao; });

    shouldNotExceed('nome', function () { return servico.nome; }, 150);
    shouldNotExceed('descricao', function () { return servico.descricao; }, 500);
    shouldNotExceed('sigla', function () { return servico.sigla; }, 15);

    it('cada nome popular deve ter no máximo 150 caracteres', function () {
      servico.nomesPopulares([_.repeat('x', 151)]);
      expect(servico.nomesPopulares.erro()).toEqual(['erro-max-150']);
    });

    it('deve haver no minimo 1 solicitante', function () {
      servico.solicitantes([]);
      expect(servico.solicitantes.erro()).toBe('erro-min-1');
    });

    it('deve haver no minimo 1 etapa', function () {
      servico.etapas([]);
      expect(servico.etapas.erro()).toBe('erro-min-1');
    });

    it('deve haver no mínimo 3 palavras chave', function () {
      expect(validacoes.Servico.palavrasChave([]).msg).toBe('erro-min-3');
      expect(validacoes.Servico.palavrasChave(['p1', 'p2']).msg).toBe('erro-min-3');
      expect(validacoes.Servico.palavrasChave(['p1', 'p2', 'p3']).msg).toBeUndefined();
    });

    itemsShouldMax('palavras chave', validacoes.Servico.palavrasChave, 50, _.property('campos'));



    it('deve haver no minimo 1 segmento de sociedade selecionado', function () {
      expect(validacoes.Servico.segmentosDaSociedade([{}])).toBeUndefined();
      expect(validacoes.Servico.segmentosDaSociedade([])).toBe('erro-min-1');
    });

    it('deve haver no minimo 1 area de interesse selecionada', function () {
      expect(validacoes.Servico.areasDeInteresse([{}])).toBeUndefined();
      expect(validacoes.Servico.areasDeInteresse([])).toBe('erro-min-1');
    });

    it('deve haver no minimo 1 lei informada', function () {
      expect(validacoes.Servico.legislacoes([{}])).toBeUndefined();
      expect(validacoes.Servico.legislacoes([])).toBe('erro-min-1');
    });
  });

  describe('tempo total estimado', function () {
    var tte;
    beforeEach(function () {
      tte = new modelos.TempoTotalEstimado();
    });

    itIsMandatory('ate', validacoes.TempoTotalEstimado.ateMaximo);
    itIsMandatory('unidade de tempo, ate', validacoes.TempoTotalEstimado.ateTipoMaximo);
    itShouldMax('comentários ou informações adicionais', validacoes.TempoTotalEstimado.descricao, 500);
    itIsMandatory('entre minimo', validacoes.TempoTotalEstimado.entreMinimo);
    itIsMandatory('entre maximo', validacoes.TempoTotalEstimado.entreMaximo);
    itIsMandatory('unidade de tempo, entre', validacoes.TempoTotalEstimado.entreTipoMaximo);
  });

  describe('solicitante', function () {
    itIsMandatory('tipo de solicitante', validacoes.Solicitante.tipo);
    itIsMandatory('tipo de solicitante', validacoes.Solicitante.tipo, 150);
    itShouldMax('requisitos de solicitante', validacoes.Solicitante.requisitos, 500);
  });

  describe('etapa >', function () {
    var etapa;

    beforeEach(function () {
      etapa = new modelos.Etapa();
    });

    shouldNotExceed('titulo', function () { return etapa.titulo; }, 100);
    shouldNotExceed('descrição', function () { return etapa.descricao; }, 500);

    describe('documentos >', function () {
      itIsCaso(modelos.Documentos, validacoes.Etapa.documentos, validacoes.Documento);

      describe('documento', function () {
        itShouldMax('', validacoes.Documento.campo, 150);
      });
    });

    describe('custos >', function () {
      itIsCaso(modelos.Custos, validacoes.Etapa.custos, validacoes.Custo);

      describe('custo >', function () {
        itShouldMax('descricao', validacoes.Custo.descricao, 150);
        itShouldBeNumeric('valor', validacoes.Custo.valor);
      });
    });

    describe('canais de prestação >', function () {
      itIsCaso(modelos.CanaisDePrestacao, validacoes.Etapa.canaisDePrestacao, validacoes.CanalDePrestacao);

      describe('canal de prestação >', function () {
        itShouldMax('descricao', validacoes.CanalDePrestacao.descricao, 500);
        itIsMandatory('tipo', validacoes.CanalDePrestacao.tipo);
      });
    });
  });

  describe('wrapper validação', function () {

    var campo;

    beforeEach(function () {
      campo = validacoes.prop(null, validacoes.obrigatorio);
    });

    it('não deve validar estado inicial', function () {
      expect(campo.erro()).toBeUndefined();
    });

    it('deve conter erro ao setar valor inválido', function () {
      campo('');
      expect(campo.erro()).toBe('erro-campo-obrigatorio');
    });

    it('não deve conter erro ao setar valor válido', function () {
      campo('um valor válido');
      expect(campo.erro()).toBeUndefined();
    });

  });

});
