package br.gov.servicos.editor.servicos;

import br.gov.servicos.editor.cartas.Carta;
import br.gov.servicos.editor.cartas.Cartas;
import lombok.experimental.FieldDefaults;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletResponse;
import java.io.FileNotFoundException;
import java.io.IOException;

import static lombok.AccessLevel.PRIVATE;
import static org.springframework.web.bind.annotation.RequestMethod.GET;

@Controller
@FieldDefaults(level = PRIVATE, makeFinal = true)
class EditarCartaController {

    Cartas cartas;

    @Autowired
    EditarCartaController(Cartas cartas) {
        this.cartas = cartas;
    }

    @ResponseBody
    @RequestMapping(value = "/editar/api/servico/v3/{id}", method = GET, produces = "application/xml")
    String editarV3(
            @PathVariable("id") Carta carta,
            HttpServletResponse response
    ) throws IOException {
        Metadados metadados = cartas.comRepositorioAberto(git -> cartas.metadados(git, carta));

        response.setHeader("X-Git-Revision", metadados.getRevisao());
        response.setHeader("X-Git-Author", metadados.getAutor());
        response.setDateHeader("Last-Modified", metadados.getHorario().getTime());

        return cartas.executaNoBranchDoServico(carta, cartas.leitor(carta))
                .orElseThrow(() -> new FileNotFoundException(
                        "Não foi possível encontrar o serviço referente ao arquivo '" + carta.getId() + "'"
                ));
    }

    @ResponseBody
    @ExceptionHandler(FileNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public void naoEncontrado() {
    }

}
