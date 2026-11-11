// troca o confirm() do navegador por um modal no visual do site
function confirmar({ titulo, texto, ok = 'Confirmar', cancelar = 'Voltar', perigo = false }) {
  return new Promise((resolver) => {
    const d = document.createElement('dialog');
    d.className = 'modal folha';
    d.innerHTML = `
      <h3></h3>
      <p></p>
      <div class="acoes">
        <button type="button" class="btn ${perigo ? 'perigo' : ''}" data-r="1"></button>
        <button type="button" class="btn secundario" data-r="0"></button>
      </div>`;
    d.querySelector('h3').textContent = titulo;
    d.querySelector('p').textContent = texto || '';
    d.querySelector('[data-r="1"]').textContent = ok;
    d.querySelector('[data-r="0"]').textContent = cancelar;

    let resposta = false;
    d.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (b) resposta = b.dataset.r === '1';
      // clique fora da caixa também fecha
      if (b || e.target === d) d.close();
    });
    d.addEventListener('close', () => {
      d.remove();
      resolver(resposta);
    });

    document.body.appendChild(d);
    d.showModal();
    d.querySelector('[data-r="0"]').focus();
  });
}
