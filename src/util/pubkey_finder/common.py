from dataclasses import dataclass
import hashlib
import pickle


@dataclass(frozen=True)
class Dsp:
	domain: str
	selector: str

	def __init__(self, domain: str, selector: str):
		object.__setattr__(self, 'domain', domain.lower())
		object.__setattr__(self, 'selector', selector.lower())


@dataclass
class MsgInfo:
	signedData: bytes
	signature: bytes
	source: str
	date: str


# https://stackoverflow.com/a/2212923/961254
def gen_primes():
	D: dict[int, list[int]] = {}
	q = 2
	while True:
		if q not in D:
			yield q
			D[q * q] = [q]
		else:
			for p in D[q]:
				D.setdefault(p + q, []).append(p)
			del D[q]
		q += 1


def first_n_primes(n: int) -> list[int]:
	x: set[int] = set()
	y = 0
	a = gen_primes()
	while y < n:
		x |= set([next(a)])
		y += 1
	return list(sorted(x))


def load_signed_data(datasig_files: list[str]):
	result: dict[Dsp, list[MsgInfo]] = {}
	for f in datasig_files:
		file_load_result = pickle.load(open(f, 'rb'))
		for dsp, msg_infos in file_load_result.items():
			if not dsp in result:
				result[dsp] = []
			result[dsp].extend(msg_infos)
	return result
