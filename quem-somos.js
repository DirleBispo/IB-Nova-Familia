(function(){
  if(typeof window.showView!=='function'||typeof window.openPanel!=='function')return;

  const previousShowView=window.showView;
  const content=`
    <div class="about-page">
      <section class="about-intro" aria-labelledby="aboutIntroTitle">
        <img src="photo_5143638454599093943_y.jpg" alt="Logo da Igreja Batista Nova Família">
        <div>
          <span class="section-kicker">Conheça nossa igreja</span>
          <h3 id="aboutIntroTitle">Uma igreja para toda a família</h3>
          <p>Proclamando o Evangelho, cuidando de pessoas e fortalecendo famílias em Sorocaba.</p>
        </div>
      </section>

      <div class="about-accordion-list">
        <details class="about-accordion" open>
          <summary>Nossa história</summary>
          <div class="about-accordion-content about-prose">
            <p>A <strong>Igreja Batista Nova Família</strong> nasceu no coração de Deus e iniciou suas atividades ministeriais em 2023, no bairro Parque São Bento, em Sorocaba/SP.</p>
            <p>Conduzida pelos Pastores Presidentes <strong>Dirlei Bispo e Vandessa Nunes Bispo</strong>, a igreja foi fundamentada sobre as Sagradas Escrituras. Em 13 de março de 2025, foi oficialmente constituída e regularizada, consolidando juridicamente a obra que Deus estabeleceu espiritualmente.</p>
          </div>
        </details>

        <details class="about-accordion">
          <summary>Missão, visão e valores</summary>
          <div class="about-accordion-content">
            <div class="about-purpose-grid">
              <article>
                <span>Missão</span>
                <p>Proclamar o Evangelho de Jesus Cristo, fazer discípulos, restaurar vidas, fortalecer famílias e servir à sociedade por meio da Palavra, da oração e do amor.</p>
              </article>
              <article>
                <span>Visão</span>
                <p>Ser uma igreja bíblica, acolhedora e relevante, formando discípulos que reflitam o caráter de Cristo e vivam os princípios do Evangelho.</p>
              </article>
            </div>
            <ul class="about-values">
              <li>A Bíblia Sagrada como única regra de fé e prática</li>
              <li>Jesus Cristo como único Senhor e Salvador</li>
              <li>Dependência do Espírito Santo</li>
              <li>Santidade e integridade</li>
              <li>Oração e intimidade com Deus</li>
              <li>Amor ao próximo e discipulado</li>
              <li>Unidade ministerial e valorização da família</li>
              <li>Excelência no serviço ao Reino</li>
            </ul>
          </div>
        </details>

        <details class="about-accordion">
          <summary>Liderança pastoral</summary>
          <div class="about-accordion-content about-leadership-grid">
            <article class="about-leader about-leader-featured">
              <span>Pastores Presidentes</span>
              <strong>Pr. Dirlei Bispo e Pra. Vandessa Nunes Bispo</strong>
            </article>
            <article class="about-leader">
              <span>Equipe Pastoral</span>
              <strong>Pr. Isaías de Oliveira e Pra. Cláudia Tenedine</strong>
            </article>
            <article class="about-leader">
              <span>Equipe Pastoral</span>
              <strong>Pr. Jocsã Marques e Pra. Daileane Venâncio</strong>
            </article>
          </div>
        </details>

        <details class="about-accordion">
          <summary>Cobertura e comunhão ministerial</summary>
          <div class="about-accordion-content about-prose">
            <p>A igreja caminha em comunhão, honra e unidade, sob a cobertura e unção ministerial do <strong>Pr. Rui Prates</strong>, que exerce seu ministério na Vila Rubi, em São Paulo/SP.</p>
            <p>Seguimos alinhados à visão apostólica do <strong>Ap. Dirceu Lingoist</strong>, preservando os princípios bíblicos e a unidade ministerial.</p>
          </div>
        </details>
      </div>

      <a class="about-pdf-button" href="Biografia_Igreja_Batista_Nova_Familia_Atualizada.pdf" download>
        <span>
          <strong>Biografia completa</strong>
          <small>Baixar documento em PDF</small>
        </span>
        <b aria-hidden="true">↓</b>
      </a>

      <blockquote class="about-verse">
        “Se o Senhor não edificar a casa, em vão trabalham os que a edificam.”
        <cite>Salmos 127:1</cite>
      </blockquote>
    </div>`;

  window.showView=function(view){
    if(view==='quem-somos'){
      window.setNav?.('quem-somos');
      window.openPanel('Quem Somos',content);
      return;
    }
    return previousShowView(view);
  };
})();
