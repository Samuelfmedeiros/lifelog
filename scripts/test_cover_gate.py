#!/usr/bin/env python3
"""Gate de pixels das capas — imagens sintéticas, sem chamar o Worker.

Roda com: python3 -m unittest scripts/test_cover_gate.py -v
"""
import os
import tempfile
import unittest

from PIL import Image, ImageDraw

import cover_gate as cg


def make_cover(path, bg, shape=False, dark_borders=False, dims=None):
    w, h = dims or cg.DIMS
    im = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(im)
    if shape:
        d.ellipse((int(w * 0.36), int(h * 0.28), int(w * 0.64), int(h * 0.72)),
                  fill=(109, 40, 217))
    if dark_borders:
        d.rectangle((0, 0, 60, h), fill=(0, 0, 0))
        d.rectangle((w - 60, 0, w, h), fill=(0, 0, 0))
    im.save(path, "WEBP")


class TestCoverGate(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.n = 0

    def tearDown(self):
        self.tmp.cleanup()

    def path(self):
        self.n += 1
        return os.path.join(self.tmp.name, f"capa-{self.n}.webp")

    def test_capa_boa_passa(self):
        p = self.path()
        make_cover(p, (245, 235, 200), shape=True)
        m = cg.medir(p)
        self.assertTrue(cg.passa(m), cg.motivo_reprovacao(m))

    def test_fundo_branco_reprovado(self):
        p = self.path()
        make_cover(p, (255, 255, 255), shape=True)
        m = cg.medir(p)
        self.assertFalse(cg.passa(m))
        self.assertIn("branca", cg.motivo_reprovacao(m))

    def test_capa_escura_reprovada(self):
        p = self.path()
        make_cover(p, (20, 20, 30), shape=True)
        m = cg.medir(p)
        self.assertFalse(cg.passa(m))
        self.assertIn("escura", cg.motivo_reprovacao(m))

    def test_bordas_escuras_reprovadas(self):
        p = self.path()
        make_cover(p, (245, 235, 200), shape=True, dark_borders=True)
        m = cg.medir(p)
        self.assertFalse(cg.passa(m))
        self.assertIn("borda", cg.motivo_reprovacao(m))

    def test_fora_de_21x9_reprovado(self):
        p = self.path()
        make_cover(p, (245, 235, 200), shape=True, dims=(1280, 720))
        m = cg.medir(p)
        self.assertFalse(cg.passa(m))
        self.assertIn("dims=", cg.motivo_reprovacao(m))

    def test_score_ordena_pior_primeiro(self):
        ruim = {"brightness": 50.0, "white": 10.0, "dims": cg.DIMS,
                "borda_esq": 500, "borda_dir": 500}
        bom = {"brightness": 85.0, "white": 0.2, "dims": cg.DIMS,
               "borda_esq": 500, "borda_dir": 500}
        self.assertGreater(cg.score(ruim), cg.score(bom))


if __name__ == "__main__":
    unittest.main()
