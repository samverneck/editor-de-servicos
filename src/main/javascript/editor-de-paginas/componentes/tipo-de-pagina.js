'use strict';

var referencia = require('referencia');

module.exports = {

    controller: function (args) {
        this.pagina = args.pagina;
    },

    view: function (ctrl, args) {
        return m('fieldset#tipoDePagina', [
            m('h3', [
                'Tipo de Página: ',
                m.component(require('componentes/select2'), {
                    prop: ctrl.pagina.tipo,
                    data: referencia.tiposDePagina
                })
            ])
        ]);
    }
};