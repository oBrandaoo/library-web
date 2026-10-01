# Mooney's — uma livraria inspirada em YOU

Uma experiência de fã não oficial: entre em uma livraria 3D inspirada na Mooney's, caminhe entre as estantes e examine 32 livros e referências literárias das cinco temporadas de *YOU*. O salão tem balcão central de madeira, caixa registradora, luminária verde, estantes em volta, escada em espiral e vitrines internas. A porta dos fundos abre para uma escadaria que leva ao porão e ao quarto de vidro, também explorável. A composição se inspira no [tour do set](https://www.architecturaldigest.com/video/watch/set-tour-touring-the-you-season-5-set-with-penn-badgley) e nos [bastidores da Netflix](https://www.netflix.com/tudum/videos/you-behind-the-scenes-set-secrets); a planta jogável é uma interpretação, não uma reprodução exata da filmagem.

Joe fica atrás do balcão e Beck percorre a área de ficção. Ao se aproximar, você pode conversar com eles e abrir o livro que mencionam. As figuras e falas são criações originais para esta experiência, sem fotografias ou áudio da série. Os [arquivos e prompts das figuras](docs/character-assets.md) estão documentados separadamente.

As capas mostram edições reais das obras e são carregadas da [Open Library](https://openlibrary.org/dev/docs/api/covers). Ao examinar um livro, o painel central apresenta a obra e uma breve nota sobre sua presença na série. O modelo pode ser girado e aberto; as páginas internas são uma representação ilustrativa criada para este projeto, não uma reprodução do texto publicado.

## Executar

```bash
npm install
npm run dev
```

Abra o endereço local exibido pelo Vite. Para gerar a versão de produção, use `npm run build`.

## Controles

- **Computador:** selecione **Abrir a porta da Mooney's** para ouvir a campainha e entrar, caminhe com **W A S D**, olhe com o mouse e pressione **E** ao mirar em um livro, Joe, Beck ou uma porta. **Esc** pausa a exploração.
- **Celular:** arraste a cena para olhar, use as setas para caminhar e toque em um livro, personagem ou porta próxima para interagir.
- **Mesa de leitura:** arraste para girar o modelo 3D, selecione **Abrir modelo** para ver o interior ilustrativo e use **Ver na Open Library** para abrir a ficha da obra.

Um link direto como `#livro=OL67368W` abre a obra correspondente. Acrescente `&aberto=1` para mostrar o modelo aberto.
Use `#personagem=joe` ou `#personagem=beck` para abrir uma conversa, `#explorar` para entrar direto na loja, `#porao` para começar no porão e `#quarto` para começar no quarto de vidro.

As referências foram conferidas com a [lista comunitária das primeiras temporadas](https://www.reddit.com/r/YouOnLifetime/comments/gumubn/every_direct_book_reference_in_you/), [o levantamento da terceira](https://booksbird.wordpress.com/2021/10/26/all-the-books-in-netflixs-you-season-three/), [as referências da quarta](https://www.elitedaily.com/entertainment/literary-references-you-season-4) e [a entrevista sobre o final da série](https://au.variety.com/2025/tv/features/you-series-finale-joe-goldberg-prison-marienne-return-21961/). O cenário se inspira na [descrição da Mooney's pela Netflix](https://www.netflix.com/tudum/features/you-season-5-mooneys-bookstore-screening). A seleção é curada, não uma lista completa ou oficial de todos os livros da série. O projeto usa Three.js e Vite.
