package br.gov.servicos.editor.conteudo;

import br.gov.servicos.editor.conteudo.paginas.TipoPagina;
import br.gov.servicos.editor.git.Metadados;
import br.gov.servicos.editor.git.RepositorioGit;
import br.gov.servicos.editor.git.Revisao;
import br.gov.servicos.editor.security.UserProfile;
import br.gov.servicos.editor.utils.EscritorDeArquivos;
import br.gov.servicos.editor.utils.LeitorDeArquivos;
import br.gov.servicos.editor.utils.ReformatadorXml;
import com.github.slugify.Slugify;
import lombok.Getter;
import lombok.SneakyThrows;
import lombok.experimental.FieldDefaults;
import org.springframework.cache.annotation.CacheConfig;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.w3c.dom.Document;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.dom.DOMSource;
import java.io.FileNotFoundException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;

import static br.gov.servicos.editor.config.CacheConfig.METADADOS;
import static br.gov.servicos.editor.utils.Unchecked.Supplier.uncheckedSupplier;
import static java.lang.String.format;
import static lombok.AccessLevel.PRIVATE;
import static lombok.AccessLevel.PROTECTED;
import static org.eclipse.jgit.lib.Constants.MASTER;
import static org.eclipse.jgit.lib.Constants.R_HEADS;

@FieldDefaults(level = PRIVATE, makeFinal = true)
@CacheConfig(cacheNames = METADADOS, keyGenerator = "geradorDeChavesParaCacheDeCommitsRecentes")
public abstract class ConteudoVersionado<T> {

    @Getter
    private String id;

    @Getter(PROTECTED)
    RepositorioGit repositorio;

    @Getter
    TipoPagina tipo;

    LeitorDeArquivos leitorDeArquivos;

    EscritorDeArquivos escritorDeArquivos;

    Slugify slugify;

    ReformatadorXml reformatadorXml;

    public ConteudoVersionado(String id, RepositorioGit repositorio, TipoPagina tipo, LeitorDeArquivos leitorDeArquivos, EscritorDeArquivos escritorDeArquivos, Slugify slugify, ReformatadorXml reformatadorXml) {
        this.id = id;
        this.repositorio = repositorio;
        this.tipo = tipo;
        this.leitorDeArquivos = leitorDeArquivos;
        this.escritorDeArquivos = escritorDeArquivos;
        this.slugify = slugify;
        this.reformatadorXml = reformatadorXml;
    }

    public Path getCaminho() {
        return Paths.get(tipo.getCaminhoPasta().toString(), getId() + "." + tipo.getExtensao());
    }

    public String getBranchRef() {
        return R_HEADS + tipo.prefixo() + getId();
    }

    private String getBranchMasterRef() {
        return R_HEADS + MASTER;
    }

    public Path getCaminhoAbsoluto() {
        return repositorio.getCaminhoAbsoluto().resolve(getCaminho()).toAbsolutePath();
    }

    public Path getCaminhoRelativo() {
        return repositorio.getCaminhoAbsoluto().relativize(getCaminhoAbsoluto());
    }

    protected Optional<Revisao> getRevisaoMaisRecenteDoArquivo() {
        return repositorio.getRevisaoMaisRecenteDoArquivo(getCaminhoRelativo());
    }

    protected Optional<Revisao> getRevisaoMaisRecenteDoBranch() {
        return repositorio.getRevisaoMaisRecenteDoBranch(getBranchRef());
    }

    public boolean existe() {
        return existeNoMaster() || existeNoBranch();
    }

    public boolean existeNoMaster() {
        return repositorio.comRepositorioAbertoNoBranch(getBranchMasterRef(),
                () -> getCaminhoAbsoluto().toFile().exists());
    }

    public boolean existeNoBranch() {
        return repositorio.existeBranch(getBranchRef())
                && repositorio.comRepositorioAbertoNoBranch(getBranchRef(),
                () -> getCaminhoAbsoluto().toFile().exists());
    }

    @Cacheable
    public Metadados<T> getMetadados() {
        return internalGetMetadados();
    }

    protected abstract T getMetadadosConteudo();

    protected Metadados<T> internalGetMetadados() {
        return new Metadados<T>()
                .withId(getId())
                .withPublicado(getRevisaoMaisRecenteDoArquivo().orElse(null))
                .withEditado(getRevisaoMaisRecenteDoBranch().orElse(null))
                .withConteudo(getMetadadosConteudo());
    }

    @CacheEvict
    public void salvar(UserProfile profile, String conteudo) {
        repositorio.comRepositorioAbertoNoBranch(getBranchRef(), () -> {
            salvarConteudo(profile, getBranchRef(), conteudo);
            return null;
        });
    }

    @CacheEvict
    public void remover(UserProfile profile) {
        repositorio.comRepositorioAbertoNoBranch(this.getBranchMasterRef(), () -> {
            repositorio.pull();

            repositorio.deleteLocalBranch(this.getBranchRef());
            repositorio.deleteRemoteBranch(this.getBranchRef());

            if (isPublicado()) {
                repositorio.remove(getCaminhoRelativo());
                repositorio.commit(getCaminhoRelativo(), "Remove '" + getId() + "'", profile);
                repositorio.push(getBranchMasterRef());
            }
            return null;
        });
    }

    @SneakyThrows
    @CacheEvict
    public void publicar(UserProfile profile) {
        if (!existeNoBranch()) {
            return;
        }

        String conteudo = getConteudoRaw();

        repositorio.comRepositorioAbertoNoBranch(getBranchMasterRef(), () -> {
            salvarConteudo(profile, getBranchMasterRef(), conteudo);

            repositorio.deleteLocalBranch(getBranchRef());
            repositorio.deleteRemoteBranch(getBranchRef());

            return null;
        });
    }

    @CacheEvict
    public void descartarAlteracoes() {
        if (!existeNoBranch()) {
            return;
        }

        repositorio.comRepositorioAbertoNoBranch(getBranchMasterRef(), () -> {
            repositorio.deleteLocalBranch(getBranchRef());
            repositorio.deleteRemoteBranch(getBranchRef());
            return null;
        });
    }

    @SneakyThrows
    @CacheEvict
    public void despublicarAlteracoes(UserProfile profile) {
        if (!existeNoMaster()) return;
        String conteudo = getConteudoRaw();
        salvar(profile, conteudo);
        despublicar(profile);
    }

    @CacheEvict
    public String renomear(UserProfile profile, String novoNome) {
        String novoId = slugify.slugify(novoNome);
        String novoBranch = tipo.prefixo() + novoId;

        repositorio.comRepositorioAbertoNoBranch(getBranchRef(), uncheckedSupplier(() -> {
            repositorio.pull();
            alterarConteudo(profile, novoNome, getBranchRef());
            if (!getId().equals(novoId)) {
                repositorio.moveBranchPara(novoBranch);
                renomearConteudo(profile, novoId, novoBranch);
                repositorio.deleteRemoteBranch(getBranchRef());
            }
            return null;
        }));

        repositorio.comRepositorioAbertoNoBranch(getBranchMasterRef(), uncheckedSupplier(() -> {
            repositorio.pull();
            if (isPublicado()) {
                alterarConteudo(profile, novoNome, getBranchMasterRef());
                if (!getId().equals(novoId)) {
                    renomearConteudo(profile, novoId, getBranchMasterRef());
                }
            }
            return null;
        }));

        return novoId;
    }

    @CacheEvict
    public String getConteudoRaw() throws FileNotFoundException {
        return repositorio.comRepositorioAbertoNoBranch(getBranchRef(), () -> {
            repositorio.pull();
            return leitorDeArquivos.ler(getCaminhoAbsoluto().toFile());
        }).orElseThrow(
                () -> new FileNotFoundException("Não foi possível encontrar o " + getTipo().getNome() + " referente ao arquivo '" + getCaminhoAbsoluto() + "'")
        );
    }

    private boolean isPublicado() {
        return Files.exists(getCaminhoAbsoluto());
    }


    private void despublicar(UserProfile profile) {
        repositorio.comRepositorioAbertoNoBranch(getBranchMasterRef(), () -> {
            repositorio.remove(getCaminhoRelativo());
            repositorio.commit(getCaminhoRelativo(), "Remove '" + getId() + "'", profile);
            repositorio.push(getBranchMasterRef());

            return null;
        });
    }

    @SneakyThrows
    private String mudarNomeConteudo(String novoNome) {
        DocumentBuilderFactory dbFactory = DocumentBuilderFactory.newInstance();
        DocumentBuilder dBuilder = dbFactory.newDocumentBuilder();
        Document doc = dBuilder.parse(getCaminhoAbsoluto().toFile());
        doc.getElementsByTagName("nome").item(0).setTextContent(novoNome);
        return reformatadorXml.formata(new DOMSource(doc));
    }


    private void salvarConteudo(UserProfile profile, String branch, String conteudo, String mensagemBase) {
        String mensagem = format("%s '%s'", mensagemBase, getId());

        repositorio.pull();
        escritorDeArquivos.escrever(getCaminhoAbsoluto(), conteudo);

        repositorio.add(getCaminhoRelativo());
        repositorio.commit(getCaminhoRelativo(), mensagem, profile);
        repositorio.push(branch);
    }

    private void salvarConteudo(UserProfile profile, String branch, String conteudo) {
        salvarConteudo(profile, branch, conteudo, getCaminhoAbsoluto().toFile().exists() ? "Altera" : "Cria");
    }

    @SneakyThrows
    private void renomearConteudo(UserProfile profile, String nomeNovoArquivo, String branch) {
        String mensagem = format("Renomeia '%s' para '%s'", getId(), nomeNovoArquivo);
        Path novoCaminho = getCaminhoRelativo().resolveSibling(nomeNovoArquivo + ".xml");
        Files.move(getCaminhoAbsoluto(), getCaminhoAbsoluto().resolveSibling(nomeNovoArquivo + ".xml"));
        repositorio.remove(getCaminhoRelativo());
        repositorio.commit(getCaminhoRelativo(), mensagem, profile);
        repositorio.add(novoCaminho);
        repositorio.commit(novoCaminho, mensagem, profile);
        repositorio.push(branch);
    }

    private void alterarConteudo(UserProfile profile, String novoNome, String branch) {
        String conteudo = mudarNomeConteudo(novoNome);
        salvarConteudo(profile, branch, conteudo);
    }
}
