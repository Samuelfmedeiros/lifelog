#!/usr/bin/env python3
"""Gate dos prompts contextuais de capa (27/11/2026).

Roda com: python3 -m unittest scripts/test_cover_brief.py -v
(repo: ~/projetos/lifelog)
"""
import unittest

import cover_brief as cb

SLUGS = [
    "arachne-o-backend-que-nao-existia",
    "capivara-o-alarme-que-acusava-a-protecao",
    "1290-paginas-indexadas-6-cliques-90-dias",
    "dogwalk-o-contador-que-desligou-o-freio",
    "estudos-a-permissao-que-nao-da-erro",
    "lifelog-o-modulo-que-virava-funcao",
    "portfolio-os-eventos-que-o-painel-nunca-recebeu",
    "seguranca-o-segredo-em-644",
    "tatuengine-as-tres-tentativas-que-deram-nao",
    "yurumi-o-monitor-que-marcava-o-site-saudavel-como-fora",
]


class TestCoverBrief(unittest.TestCase):
    def test_prompts_distintos(self):
        prompts = [cb.build_prompt(s) for s in SLUGS]
        self.assertEqual(len(prompts), len(set(prompts)),
                         "dois slugs produziram o MESMO prompt")

    def test_prompt_tem_as_tres_camadas(self):
        for s in SLUGS:
            p = cb.build_prompt(s)
            with self.subTest(slug=s):
                self.assertIn("Scene: ", p)
                self.assertIn("Subject of the post", p, "tese ausente")
                self.assertIn("Color palette: ", p)
                self.assertIn("no dark areas", p)
                self.assertIn("21:9", p)

    def test_tag_de_projeto_nao_decide_motivo(self):
        brief = {"tags": ["arachne", "python"], "title": "x", "description": "y"}
        self.assertEqual(cb.pick_motif(brief)[0], "camadas")
        self.assertEqual(cb.pick_motif({"tags": ["yurumi"]})[0], "orbita")

    def test_mesmo_motivo_variacao_por_slug(self):
        # dois posts REAIS do mesmo motivo (escudo), projetos diferentes
        a_slug = "seguranca-o-segredo-em-644"
        b_slug = "estudos-a-permissao-que-nao-da-erro"
        a = cb.build_prompt(a_slug)
        b = cb.build_prompt(b_slug)
        self.assertEqual(cb.pick_motif(cb.read_brief(a_slug))[0], "escudo")
        self.assertEqual(cb.pick_motif(cb.read_brief(b_slug))[0], "escudo")
        self.assertNotEqual(a, b, "dois posts do mesmo motivo sairam identicos")
        self.assertEqual(a.split(". ")[1], b.split(". ")[1],
                         "a CENA do motivo deveria ser a mesma")

    def test_paleta_yurumi_sem_cor_escura(self):
        self.assertNotIn("#0b1424", cb.PROJECT_STYLES["yurumi"]["colors"])

    def test_determinismo_entre_chamadas(self):
        self.assertEqual(cb.build_prompt(SLUGS[0]), cb.build_prompt(SLUGS[0]))

    def test_motivos_conhecidos_tem_cena(self):
        for motivo in set(cb.TAG_MOTIF.values()) | {"orbita"}:
            with self.subTest(motivo=motivo):
                self.assertIn(motivo, cb.MOTIF_SCENE)


if __name__ == "__main__":
    unittest.main()
