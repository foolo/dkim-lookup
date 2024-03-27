import argparse
import queue
import threading
import modal
import dns.exception
import dns.resolver
import dns.rdatatype

stub = modal.Stub("dsp-onetime-batch")

q: "queue.Queue[str]" = queue.Queue()


def worker():
	while True:
		qname = q.get()
		try:
			response = dns.resolver.resolve(qname, dns.rdatatype.TXT)
			if len(response) == 0:
				#print(f'warning: no records found for {qname}')
				pass
			elif len(response) > 1:
				#print(f'warning: > 1 record found for {qname}, using first one')
				pass
			print(f'found dkim record for {qname}')
		except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers, dns.exception.Timeout) as e:
			#print(f'warning: dns resolver error: {e}')
			pass
		print(f"done with {qname}")
		q.task_done()


def process_domain(domain: str, selectors: list[str]) -> int:
	print(f"parsing {len(selectors)} selectors... and domain {domain}")
	for _i in range(10):
		t = threading.Thread(target=worker, daemon=True)
		t.start()
	for selector in selectors:
		qname = f"{selector}._domainkey.{domain}"
		q.put(qname)
	q.join()
	return len(selectors)


@stub.function()  # type: ignore
def process_domain_wrapper(domain: str, selectors: list[str]) -> int:
	print(f"calling parselist")
	return process_domain(domain, selectors)


def run_batch_job(domains_filename: str, selectors_filename: str, local: bool = False):
	with open(selectors_filename) as f:
		selectors = f.read().splitlines()
	with open(domains_filename) as f:
		domains = f.read().splitlines()
	for domain in domains:
		print(f"processing domain {domain}")
		if local:
			process_domain(domain, selectors)
		else:
			process_domain_wrapper.remote(domain, selectors)


# remote entrypoint
@stub.local_entrypoint()  # type: ignore
def main(domains_filename: str, selectors_filename: str):
	run_batch_job(domains_filename, selectors_filename)


# local entrypoint
if __name__ == "__main__":
	parser = argparse.ArgumentParser(description='Process some integers.')
	parser.add_argument('--domains-filename', type=str)
	parser.add_argument('--selectors-filename', type=str)
	args = parser.parse_args()
	run_batch_job(args.domains_filename, args.selectors_filename, local=True)
