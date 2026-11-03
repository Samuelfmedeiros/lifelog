// Gerado automaticamente por scripts/gen-ocultos.mjs
// NÃO editar manualmente

export default [
  {
    "path": "tatuengine-case-b2b-ternario-32gb.mdx",
    "slug": "tatuengine-case-b2b-ternario-32gb",
    "lang": "pt",
    "title": "Como reduzimos o estouro de memória do TatuEngine de 27GB para 245MB com pesos ternários",
    "date": "2026-10-31 00:00:00 -03:00",
    "project": "tatuengine",
    "content": "Agentes autônomos de código entram em falha silenciosa por dois motivos principais: alucinação sintática não tratada e exaustão de memória na camada de inferência.\n\nNo TatuEngine, o gargalo era o peso: um TriangleLens por peso ocupava ~32GB para 1 bilhão de parâmetros (32 bytes por peso, alinhamento padrão de struct no cache L1). A compressão veio do block codec: blocos de 32x32 pesos ternários {-1, 0, +1} em uma BlockLens de 288 bytes. Resultado medido: **245MB contra 27,26GB**, compressão de 114x, com MSE de 3,7e-9 (ULP) no in_proj frente ao element-wise bridge_matmul.\n\nO que mudou na prática:\n\n- **Inferência em GPU (RTX 3060):** o traversal paralelo de BVH na GPU ficou bit-a-bit idêntico ao CPU ground truth (16/16 testes de coerência, phase diff 0.00e+00).\n- **Block-encoded BVH:** 893K blocos para o modelo de 1B (in_proj, out_proj, lm_head), 245MB de VRAM contra 611MB do packed.\n- **Pipeline híbrido:** CPU para o estado do SSM (conv1d, RMSNorm, step) + bridge_matmul para as matmuls pesadas (in_proj, out_proj, lm_head). Speedup medido: 69,4x (4,092s/tok CPU para 0,059s/tok GPU).\n\nO que NÃO fizemos (e por quê):\n\n- Não publicamos um comando de instalação que não roda. O CLI real do `ai-test-loop` exige `--config` e aceita `--json`, `--quiet`, `--dry-run`, `--show-state`. Qualquer botão \"copiar e colar\" precisa refletir isso — caso contrário a conversão morre no terminal do visitante.\n\nSe você monta pipeline de inferência local e está batendo em VRAM, o caminho não é quantizar pós-treino (o TatuEngine perde coerência nesse caso — só funciona treinado desde o zero com pesos ternários). O caminho é block encoding + GPU traversal + pipeline híbrido.\n\nO paradigma por trás: substituímos multiplicações de ponto flutuante por operações de adição em tensores ternários. Isso remove o gargalo da FPU e mapeia diretamente para os Warps da NVIDIA — cada bloco de 32×32 pesos cabe em um Warp, e a travessia paralela de BVH na GPU fica bit-a-bit idêntica ao CPU ground truth."
  }
];
