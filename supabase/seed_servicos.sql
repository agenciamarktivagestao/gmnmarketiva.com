-- Serviços que já estavam nos perfis em 17/11/2026 (leitura do Windsor). Rode uma vez, depois da migração 3.
begin;
update public.clientes set servicos_padrao = 0 where gbp_location = 'locations/11258295048265715047';
insert into public.servicos (cliente_id, nome, descricao, status, origem)
select c.id, s.nome, s.descricao, 'no_perfil', 'perfil'
from public.clientes c, (values
  ($q$Venda de carros seminovos em Londrina$q$, $q$Carros seminovos e usados de diferentes marcas e modelos, na Avenida Juscelino Kubitschek, em Londrina.$q$),
  ($q$Veículos multimarcas$q$, $q$Loja multimarcas com veículos de diferentes marcas e modelos.$q$),
  ($q$Compra de veículos usados$q$, $q$Compra de veículos usados, conforme a avaliação do carro pela equipe.$q$),
  ($q$Troca de veículos$q$, $q$Troca do seu veículo na compra de outro, mediante avaliação.$q$),
  ($q$Transferência e documentação de veículos$q$, $q$Orientação e apoio na transferência e na documentação do veículo.$q$)
) as s(nome, descricao) where c.gbp_location = 'locations/11258295048265715047';
update public.clientes set servicos_padrao = 18 where gbp_location = 'locations/4330909423595166642';
insert into public.servicos (cliente_id, nome, descricao, status, origem)
select c.id, s.nome, s.descricao, 'no_perfil', 'perfil'
from public.clientes c, (values
  ($q$Troca de Lentes de Óculos em Londrina$q$, $q$Troca das lentes do seu óculos de grau, com montagem na armação, na unidade da Rua João Cândido, no Centro de Londrina.$q$),
  ($q$Montagem de Óculos de Grau$q$, $q$Montagem do óculos de grau conforme a receita, com a armação que você escolher.$q$),
  ($q$Atendimento para Lentes Multifocais$q$, $q$Atendimento e orientação para a escolha de lentes multifocais conforme a receita.$q$),
  ($q$Atendimento para Lentes HOYA$q$, $q$Atendimento para lentes da marca HOYA.$q$),
  ($q$Lentes com Antirreflexo para Óculos$q$, $q$Lentes com tratamento antirreflexo para óculos de grau.$q$),
  ($q$Lentes com Filtro de Luz Azul$q$, $q$Lentes com filtro de luz azul para quem passa muito tempo diante de telas.$q$),
  ($q$Atendimento para Óculos de Grau Infantil$q$, $q$Armações e lentes para crianças, com atendimento conforme a receita.$q$),
  ($q$Lentes MiYOSMART iQ para Crianças$q$, $q$Lentes MiYOSMART iQ para o controle da progressão da miopia infantil, conforme prescrição.$q$),
  ($q$Atendimento para Lentes de Contato$q$, $q$Orientação e venda de lentes de contato conforme a receita.$q$),
  ($q$Ajuste de Armações de Óculos$q$, $q$Ajuste de hastes, plaquetas e armação para o óculos ficar confortável no rosto.$q$),
  ($q$Conserto e Manutenção de Óculos$q$, $q$Ajustes, reparos e manutenção de óculos na unidade da Rua João Cândido, no Centro de Londrina.$q$),
  ($q$Orientação na Escolha de Armações$q$, $q$Ajuda da equipe para escolher a armação conforme a receita, o estilo e a rotina.$q$)
) as s(nome, descricao) where c.gbp_location = 'locations/4330909423595166642';
update public.clientes set servicos_padrao = 16 where gbp_location = 'locations/1537135642404525646';
insert into public.servicos (cliente_id, nome, descricao, status, origem)
select c.id, s.nome, s.descricao, 'no_perfil', 'perfil'
from public.clientes c, (values
  ($q$Troca de Lentes de Óculos em Londrina$q$, $q$Troca das lentes do seu óculos de grau, com montagem na armação, na unidade da Rua Souza Naves, no Centro de Londrina.$q$),
  ($q$Montagem de Óculos de Grau$q$, $q$Montagem do óculos de grau conforme a receita, com a armação que você escolher.$q$),
  ($q$Atendimento para Lentes Multifocais$q$, $q$Atendimento e orientação para a escolha de lentes multifocais conforme a receita.$q$),
  ($q$Lentes com Antirreflexo para Óculos$q$, $q$Lentes com tratamento antirreflexo para óculos de grau.$q$),
  ($q$Lentes com Filtro de Luz Azul$q$, $q$Lentes com filtro de luz azul para quem passa muito tempo diante de telas.$q$),
  ($q$Atendimento para Óculos de Grau Infantil$q$, $q$Armações e lentes para crianças, com atendimento conforme a receita.$q$),
  ($q$Atendimento para Lentes de Contato$q$, $q$Orientação e venda de lentes de contato conforme a receita.$q$),
  ($q$Ajuste de Armações de Óculos$q$, $q$Ajuste de hastes, plaquetas e armação para o óculos ficar confortável no rosto.$q$),
  ($q$Conserto e Manutenção de Óculos$q$, $q$Ajustes, reparos e manutenção de óculos na unidade da Rua Souza Naves, no Centro de Londrina.$q$),
  ($q$Orientação na Escolha de Armações$q$, $q$Ajuda da equipe para escolher a armação conforme a receita, o estilo e a rotina.$q$)
) as s(nome, descricao) where c.gbp_location = 'locations/1537135642404525646';
update public.clientes set servicos_padrao = 3 where gbp_location = 'locations/5133814843473666058';
insert into public.servicos (cliente_id, nome, descricao, status, origem)
select c.id, s.nome, s.descricao, 'no_perfil', 'perfil'
from public.clientes c, (values
  ($q$Harmonização Facial$q$, $q$Procedimentos de harmonização facial, realizados após avaliação com a equipe da clínica, na Zona Norte de Londrina.$q$),
  ($q$Botox$q$, $q$Aplicação de toxina botulínica, realizada após avaliação individual com a equipe da clínica.$q$),
  ($q$Preenchimento Labial$q$, $q$Preenchimento labial realizado após avaliação individual com a equipe da clínica.$q$),
  ($q$Tratamento de Canal$q$, $q$Tratamento endodôntico da parte interna do dente, indicado após avaliação odontológica.$q$),
  ($q$Ortodontia$q$, $q$Avaliação e acompanhamento ortodôntico para o alinhamento dos dentes e o ajuste da mordida.$q$),
  ($q$Odontopediatria$q$, $q$Atendimento odontológico voltado para crianças, com acolhimento e foco na prevenção.$q$),
  ($q$Endodontia$q$, $q$Especialidade que cuida da polpa e das raízes dos dentes, com avaliação individual.$q$),
  ($q$Gengivoplastia$q$, $q$Procedimento para remodelar o contorno da gengiva, indicado após avaliação odontológica.$q$),
  ($q$Rinomodelação$q$, $q$Procedimento estético facial realizado após avaliação individual com a equipe da clínica.$q$),
  ($q$Bioestimulador de Colágeno$q$, $q$Procedimento estético indicado após avaliação individual com a equipe da clínica.$q$),
  ($q$Bucomaxilo$q$, $q$Atendimento na área bucomaxilofacial, com avaliação e planejamento prévios.$q$),
  ($q$Prótese protocolo sobre implantes$q$, $q$Prótese fixa apoiada em implantes para repor vários dentes, com planejamento individual.$q$),
  ($q$Implante dentário unitário$q$, $q$Implante dentário para repor um dente ausente, com avaliação e planejamento prévios.$q$),
  ($q$Prótese fixa sobre implantes$q$, $q$Prótese fixa apoiada em implantes dentários, com planejamento conforme cada caso.$q$),
  ($q$Reabilitação oral$q$, $q$Planejamento para recuperar a função e a estética da boca, com avaliação individual.$q$),
  ($q$Prótese total (dentadura)$q$, $q$Prótese total removível para repor todos os dentes de uma arcada, após avaliação.$q$),
  ($q$Prótese parcial removível$q$, $q$Prótese removível para repor alguns dentes ausentes, com avaliação individual.$q$),
  ($q$Facetas de resina$q$, $q$Facetas de resina para melhorar a aparência dos dentes, indicadas após avaliação.$q$),
  ($q$Facetas de porcelana$q$, $q$Facetas de porcelana para melhorar a aparência dos dentes, indicadas após avaliação.$q$),
  ($q$Limpeza dental$q$, $q$Limpeza dental profissional para remover placa e tártaro, com orientação de higiene.$q$),
  ($q$Extração dentária$q$, $q$Remoção de dentes quando indicada, após avaliação odontológica.$q$),
  ($q$Restauração dentária$q$, $q$Restauração para recuperar dentes danificados, após avaliação odontológica.$q$),
  ($q$Tratamento de bruxismo$q$, $q$Avaliação e acompanhamento para quem range ou aperta os dentes.$q$),
  ($q$Placa para bruxismo$q$, $q$Placa de proteção dos dentes, indicada após avaliação odontológica.$q$),
  ($q$Extração do siso$q$, $q$Remoção do dente siso quando indicada, com avaliação e planejamento prévios.$q$),
  ($q$Lentes de contato dental$q$, $q$Lâminas finas aplicadas sobre os dentes para fins estéticos, após avaliação.$q$),
  ($q$Recontorno estético dental$q$, $q$Ajuste do formato dos dentes para fins estéticos, após avaliação odontológica.$q$),
  ($q$Aparelho ortodôntico fixo$q$, $q$Aparelho fixo para alinhar os dentes, com avaliação e acompanhamento periódico.$q$),
  ($q$Clareamento dental em consultório$q$, $q$Clareamento dental realizado no consultório, após avaliação odontológica.$q$),
  ($q$Avaliação odontológica$q$, $q$Consulta para avaliar a saúde bucal e orientar os próximos passos de cuidado.$q$),
  ($q$Tratamento de cáries$q$, $q$Tratamento de cáries, com restauração do dente quando indicada.$q$)
) as s(nome, descricao) where c.gbp_location = 'locations/5133814843473666058';
update public.clientes set servicos_padrao = 0 where gbp_location = 'locations/12567270476655825189';
insert into public.servicos (cliente_id, nome, descricao, status, origem)
select c.id, s.nome, s.descricao, 'no_perfil', 'perfil'
from public.clientes c, (values
  ($q$Consórcio de Imóveis em Londrina$q$, $q$Orientação sobre consórcio imobiliário para quem quer adquirir um imóvel com planejamento.$q$),
  ($q$Carta de Crédito Imobiliário$q$, $q$Explicação de como funciona a carta de crédito no consórcio imobiliário.$q$),
  ($q$Consórcio para Construção$q$, $q$Opções de consórcio para construção, com simulação conforme o seu objetivo.$q$),
  ($q$Planejamento Patrimonial com Consórcio$q$, $q$Uso do consórcio como parte do planejamento para ampliar o patrimônio.$q$),
  ($q$Consultoria de Lances em Consórcio$q$, $q$Orientação sobre estratégias de lances em consórcio.$q$),
  ($q$Consórcio para Compra de Casa$q$, $q$Consórcio para quem quer conquistar a casa própria.$q$),
  ($q$Consórcio para Compra de Terrenos$q$, $q$Consórcio para a compra de terrenos.$q$),
  ($q$Simulação de Consórcio Imobiliário$q$, $q$Simulação de consórcio imobiliário conforme o seu objetivo.$q$),
  ($q$Orientação sobre Contemplação$q$, $q$Esclarecimento sobre como funciona a contemplação no consórcio.$q$),
  ($q$Consórcio Ademicon em Londrina$q$, $q$Soluções de consórcio da Ademicon com atendimento personalizado em Londrina.$q$),
  ($q$Consórcio de Apartamento Londrina$q$, $q$Consórcio para a compra de apartamento em Londrina.$q$),
  ($q$Especialista em Consórcio Londrina$q$, $q$Atendimento com especialista em consórcios em Londrina.$q$),
  ($q$Consórcio para Construção Londrina$q$, $q$Consórcio para construir em Londrina, com simulações e orientação.$q$)
) as s(nome, descricao) where c.gbp_location = 'locations/12567270476655825189';
update public.clientes set servicos_padrao = 21 where gbp_location = 'locations/6747473154620759023';
insert into public.servicos (cliente_id, nome, descricao, status, origem)
select c.id, s.nome, s.descricao, 'no_perfil', 'perfil'
from public.clientes c, (values
  ($q$Revisão automotiva preventiva e corretiva$q$, $q$Revisão preventiva e corretiva para manter o veículo em dia.$q$),
  ($q$Diagnóstico eletrônico com scanner$q$, $q$Diagnóstico computadorizado com scanner para identificar falhas eletrônicas do veículo.$q$),
  ($q$Reparo de injeção eletrônica$q$, $q$Diagnóstico e reparo do sistema de injeção eletrônica.$q$),
  ($q$Manutenção do sistema de arrefecimento$q$, $q$Manutenção do sistema de arrefecimento do motor.$q$)
) as s(nome, descricao) where c.gbp_location = 'locations/6747473154620759023';
update public.clientes set servicos_padrao = 16 where gbp_location = 'locations/1590305428651310036';
insert into public.servicos (cliente_id, nome, descricao, status, origem)
select c.id, s.nome, s.descricao, 'no_perfil', 'perfil'
from public.clientes c, (values
  ($q$Troca de Lentes de Óculos em Londrina$q$, $q$Troca das lentes do seu óculos de grau, com montagem na armação, na unidade Sergipe, no Centro de Londrina.$q$),
  ($q$Montagem de Óculos de Grau$q$, $q$Montagem do óculos de grau conforme a receita, com a armação que você escolher.$q$),
  ($q$Atendimento para Lentes Multifocais$q$, $q$Atendimento e orientação para a escolha de lentes multifocais conforme a receita.$q$),
  ($q$Lentes com Antirreflexo para Óculos$q$, $q$Lentes com tratamento antirreflexo para óculos de grau.$q$),
  ($q$Lentes com Filtro de Luz Azul$q$, $q$Lentes com filtro de luz azul para quem passa muito tempo diante de telas.$q$),
  ($q$Atendimento para Óculos de Grau Infantil$q$, $q$Armações e lentes para crianças, com atendimento conforme a receita.$q$),
  ($q$Atendimento para Lentes de Contato$q$, $q$Orientação e venda de lentes de contato conforme a receita.$q$),
  ($q$Ajuste de Armações de Óculos$q$, $q$Ajuste de hastes, plaquetas e armação para o óculos ficar confortável no rosto.$q$),
  ($q$Conserto e Manutenção de Óculos$q$, $q$Ajustes, reparos e manutenção de óculos na unidade Sergipe, no Centro de Londrina.$q$),
  ($q$Orientação na Escolha de Armações$q$, $q$Ajuda da equipe para escolher a armação conforme a receita, o estilo e a rotina.$q$)
) as s(nome, descricao) where c.gbp_location = 'locations/1590305428651310036';
update public.clientes set servicos_padrao = 0 where gbp_location = 'locations/10905025771538840206';
insert into public.servicos (cliente_id, nome, descricao, status, origem)
select c.id, s.nome, s.descricao, 'no_perfil', 'perfil'
from public.clientes c, (values
  ($q$Cabos flexíveis SIL$q$, $q$Cabos flexíveis SIL para instalações elétricas residenciais, comerciais e de obra.$q$),
  ($q$Disjuntores DIN, NEMA, DR e DPS$q$, $q$Disjuntores DIN e NEMA, dispositivos DR e DPS para proteção de circuitos e instalações elétricas.$q$),
  ($q$Quadros elétricos de embutir e sobrepor$q$, $q$Quadros de distribuição de embutir e de sobrepor para organizar e proteger a instalação elétrica.$q$),
  ($q$Placas e módulos (tomadas e interruptores)$q$, $q$Placas, módulos, tomadas e interruptores para o acabamento de instalações elétricas.$q$),
  ($q$Caixas de embutir$q$, $q$Caixas de embutir para instalação de tomadas, interruptores e pontos elétricos.$q$),
  ($q$Eletrodutos e mangueiras corrugadas$q$, $q$Eletrodutos e mangueiras corrugadas para passagem e proteção de fios e cabos.$q$),
  ($q$Lâmpadas bulbo, par e dicroica$q$, $q$Lâmpadas bulbo, par e dicroica para iluminação interna e decorativa.$q$),
  ($q$Lâmpadas tubulares$q$, $q$Lâmpadas tubulares para iluminação de ambientes residenciais e comerciais.$q$),
  ($q$Refletores de LED$q$, $q$Refletores de LED para iluminação externa de fachadas, quintais e áreas comerciais.$q$),
  ($q$Painéis de LED e luminárias slim$q$, $q$Painéis de LED e luminárias slim para iluminação de ambientes internos.$q$),
  ($q$Luminárias de emergência$q$, $q$Luminárias de emergência para iluminar o ambiente quando faltar energia.$q$),
  ($q$Sensores de presença$q$, $q$Sensores de presença para acender a iluminação automaticamente.$q$),
  ($q$Câmeras de segurança$q$, $q$Câmeras de segurança para o monitoramento de residências e comércios.$q$),
  ($q$Chuveiros elétricos$q$, $q$Chuveiros elétricos para uso residencial.$q$),
  ($q$Torneiras e duchas higiênicas$q$, $q$Torneiras e duchas higiênicas para banheiros e cozinhas.$q$),
  ($q$Aquecedores$q$, $q$Aquecedores para uso doméstico.$q$),
  ($q$Exaustores$q$, $q$Exaustores para ventilação de cozinhas, banheiros e ambientes comerciais.$q$),
  ($q$Ventiladores e climatizadores$q$, $q$Ventiladores e climatizadores para ambientes residenciais e comerciais.$q$),
  ($q$Umidificadores$q$, $q$Umidificadores de ar para ambientes internos.$q$),
  ($q$Temporizadores e contatores$q$, $q$Temporizadores e contatores para automação e comando de cargas elétricas.$q$),
  ($q$Hastes e conectores de aterramento$q$, $q$Hastes e conectores para sistemas de aterramento elétrico.$q$),
  ($q$Suportes de TV$q$, $q$Suportes para fixar TVs na parede.$q$),
  ($q$Ferramentas e botinas de segurança$q$, $q$Ferramentas e botinas de segurança para eletricistas e obras.$q$),
  ($q$Entrega de materiais elétricos em Londrina e região$q$, $q$Entrega de materiais elétricos em Londrina e região; consulte as condições com a equipe.$q$),
  ($q$Atendimento e pedidos pelo WhatsApp$q$, $q$Tire dúvidas, peça orientação e faça pedidos pelo WhatsApp da loja.$q$)
) as s(nome, descricao) where c.gbp_location = 'locations/10905025771538840206';
update public.clientes set servicos_padrao = 0 where gbp_location = 'locations/15994128883303422910';
insert into public.servicos (cliente_id, nome, descricao, status, origem)
select c.id, s.nome, s.descricao, 'no_perfil', 'perfil'
from public.clientes c, (values
  ($q$Limpeza de Pele Profunda$q$, $q$Tratamento estético facial para remover impurezas, excesso de oleosidade, cravos e células mortas. A limpeza de pele profunda ajuda a melhorar a textura, a aparência e o cuidado com a saúde da pele. Atendimento personalizado na clínica Aline Ceccotti, em Londrina,$q$),
  ($q$Peeling Facial para Renovação da Pele$q$, $q$O peeling facial promove a renovação da pele e pode auxiliar na melhora da textura, de manchas superficiais e da aparência de linhas finas, conforme o tipo de peeling indicado. Na clínica Aline Ceccotti, em Londrina, o tratamento é orientado de acordo com as necessidades da pele.$q$),
  ($q$Microagulhamento Facial com Ativos$q$, $q$Tratamento estético que utiliza microagulhas e ativos específicos para auxiliar na melhora da textura da pele, de cicatrizes de acne e de sinais de envelhecimento. O microagulhamento facial é realizado mediante avaliação individual na clínica Aline Ceccotti, em Londrina.$q$),
  ($q$Depilação a Laser$q$, $q$Procedimento para redução prolongada dos pelos em regiões como axilas, pernas, virilha e rosto, conforme avaliação. A depilação a laser proporciona praticidade na rotina de cuidados e pode ajudar a reduzir pelos encravados. Consulte as regiões atendidas na clínica Aline Ceccotti, em Londrina.$q$),
  ($q$Luz Pulsada para Manchas na Pele$q$, $q$Tratamento com luz intensa pulsada (IPL) indicado para determinadas alterações de pigmentação e sinais de fotoenvelhecimento. Pode auxiliar na uniformização do tom e na melhora da aparência da pele. A indicação depende de avaliação na clínica Aline Ceccotti, em Londrina.$q$),
  ($q$Ultraformer MPT para Flacidez Facial$q$, $q$O Ultraformer MPT utiliza tecnologia de ultrassom micro e macrofocado para auxiliar no tratamento da flacidez e na melhora do contorno facial e corporal, conforme indicação. Procedimento não cirúrgico, realizado após avaliação individual na clínica Aline Ceccotti, em Londrina.$q$),
  ($q$Laser CO2 Fracionado para Rejuvenescimento$q$, $q$Tratamento de renovação da pele com laser CO2 fracionado, utilizado para melhorar a aparência de rugas finas, cicatrizes e irregularidades na textura da pele. O procedimento estimula a remodelação do colágeno e requer avaliação profissional na clínica Aline Ceccotti, em Londrina.$q$),
  ($q$Jato de Plasma para Remoção de Lesões de Pele$q$, $q$Procedimento com tecnologia de plasma para tratamento de determinadas lesões superficiais benignas da pele, quando indicado. A remoção de verrugas ou outras lesões exige diagnóstico prévio e avaliação de segurança por profissional habilitado, na clínica Aline Ceccotti, em Londrina.$q$)
) as s(nome, descricao) where c.gbp_location = 'locations/15994128883303422910';
update public.clientes set servicos_padrao = 19 where gbp_location = 'locations/4862942198724333916';
insert into public.servicos (cliente_id, nome, descricao, status, origem)
select c.id, s.nome, s.descricao, 'no_perfil', 'perfil'
from public.clientes c, (values
  ($q$Montagem de Óculos de Grau$q$, $q$Montagem do óculos de grau conforme a receita, com a armação que você escolher.$q$),
  ($q$Atendimento para Lentes Multifocais$q$, $q$Atendimento e orientação para a escolha de lentes multifocais conforme a receita.$q$),
  ($q$Atendimento para Óculos de Grau Infantil$q$, $q$Armações e lentes para crianças, com atendimento conforme a receita.$q$),
  ($q$Atendimento para Lentes de Contato$q$, $q$Orientação e venda de lentes de contato conforme a receita.$q$),
  ($q$Ajuste de Armações de Óculos$q$, $q$Ajuste de hastes, plaquetas e armação para o óculos ficar confortável no rosto.$q$),
  ($q$Conserto e Manutenção de Óculos$q$, $q$Ajustes, reparos e manutenção de óculos na unidade da Avenida Rio de Janeiro, no Centro de Londrina.$q$),
  ($q$Orientação na Escolha de Armações$q$, $q$Ajuda da equipe para escolher a armação conforme a receita, o estilo e a rotina.$q$)
) as s(nome, descricao) where c.gbp_location = 'locations/4862942198724333916';
update public.clientes set servicos_padrao = 4 where gbp_location = 'locations/8109590543287195892';
insert into public.servicos (cliente_id, nome, descricao, status, origem)
select c.id, s.nome, s.descricao, 'no_perfil', 'perfil'
from public.clientes c, (values
  ($q$Insulfilm automotivo$q$, $q$Aplicação de insulfilm nos vidros do seu veículo.$q$),
  ($q$Películas residenciais$q$, $q$Películas para vidros residenciais.$q$),
  ($q$Película nano cerâmica$q$, $q$Película nano cerâmica para os vidros do veículo.$q$),
  ($q$PPF (película de proteção de pintura)$q$, $q$Película de proteção de pintura (PPF) para proteger a lataria do carro.$q$),
  ($q$Vitrificação e proteção cerâmica$q$, $q$Vitrificação e proteção cerâmica para conservar a pintura do veículo.$q$),
  ($q$Polimento técnico automotivo$q$, $q$Polimento técnico para renovar o brilho da pintura do carro.$q$),
  ($q$Polimento de faróis$q$, $q$Polimento de faróis para melhorar a aparência dos faróis do veículo.$q$),
  ($q$Polimento de vidros automotivos$q$, $q$Polimento de vidros automotivos.$q$),
  ($q$Martelinho de ouro$q$, $q$Reparo de pequenos amassados sem necessidade de repintura, conforme avaliação.$q$),
  ($q$Micro pintura automotiva$q$, $q$Retoque de pequenos riscos e falhas na pintura do veículo.$q$),
  ($q$Lavagem de bancos automotivos$q$, $q$Lavagem e higienização dos bancos do veículo.$q$),
  ($q$Escurecimento de lanternas$q$, $q$Escurecimento de lanternas para personalizar o visual do veículo.$q$),
  ($q$Envelopamento de colunas e frisos$q$, $q$Envelopamento de colunas e frisos do veículo.$q$),
  ($q$Detalhamento automotivo completo$q$, $q$Detalhamento automotivo completo, com cuidado nos detalhes interno e externo do veículo.$q$)
) as s(nome, descricao) where c.gbp_location = 'locations/8109590543287195892';
update public.clientes set servicos_padrao = 16 where gbp_location = 'locations/17286453844671735028';
insert into public.servicos (cliente_id, nome, descricao, status, origem)
select c.id, s.nome, s.descricao, 'no_perfil', 'perfil'
from public.clientes c, (values
  ($q$Troca de Lentes de Óculos em Londrina$q$, $q$Troca das lentes do seu óculos de grau, com montagem na armação, na unidade da Avenida Saul Elkind, na Zona Norte de Londrina.$q$),
  ($q$Montagem de Óculos de Grau$q$, $q$Montagem do óculos de grau conforme a receita, com a armação que você escolher.$q$),
  ($q$Atendimento para Lentes Multifocais$q$, $q$Atendimento e orientação para a escolha de lentes multifocais conforme a receita.$q$),
  ($q$Lentes com Antirreflexo para Óculos$q$, $q$Lentes com tratamento antirreflexo para óculos de grau.$q$),
  ($q$Lentes com Filtro de Luz Azul$q$, $q$Lentes com filtro de luz azul para quem passa muito tempo diante de telas.$q$),
  ($q$Atendimento para Óculos de Grau Infantil$q$, $q$Armações e lentes para crianças, com atendimento conforme a receita.$q$),
  ($q$Atendimento para Lentes de Contato$q$, $q$Orientação e venda de lentes de contato conforme a receita.$q$),
  ($q$Ajuste de Armações de Óculos$q$, $q$Ajuste de hastes, plaquetas e armação para o óculos ficar confortável no rosto.$q$),
  ($q$Conserto e Manutenção de Óculos$q$, $q$Ajustes, reparos e manutenção de óculos na unidade da Avenida Saul Elkind, na Zona Norte de Londrina.$q$),
  ($q$Orientação na Escolha de Armações$q$, $q$Ajuda da equipe para escolher a armação conforme a receita, o estilo e a rotina.$q$)
) as s(nome, descricao) where c.gbp_location = 'locations/17286453844671735028';
update public.clientes set servicos_padrao = 0 where gbp_location = 'locations/11020380700238686765';
insert into public.servicos (cliente_id, nome, descricao, status, origem)
select c.id, s.nome, s.descricao, 'no_perfil', 'perfil'
from public.clientes c, (values
  ($q$Concreto usinado$q$, $q$Concreto usinado para obras residenciais e comerciais, conforme a especificação do projeto.$q$),
  ($q$Fornecimento de Concreto para Obras$q$, $q$Fornecimento de concreto para obras de construção civil.$q$),
  ($q$Entrega de Concreto Usinado$q$, $q$Entrega do concreto na obra, com planejamento da entrega; consulte as regiões atendidas.$q$),
  ($q$Concreto Usinado para Lajes$q$, $q$Concreto usinado para a execução de lajes.$q$),
  ($q$Concreto para Fundações$q$, $q$Concreto para fundações, conforme a especificação do projeto.$q$),
  ($q$Concreto para Pisos e Contrapisos$q$, $q$Concreto para pisos e contrapisos.$q$),
  ($q$Argamassa para Construção Civil$q$, $q$Argamassa para a construção civil.$q$),
  ($q$Fornecimento de Argamassa Usinada$q$, $q$Fornecimento de argamassa usinada para obras.$q$),
  ($q$Orçamento de Concreto por m³$q$, $q$Solicite orçamento informando o volume em m³ e o tipo de obra.$q$),
  ($q$Bombeamento de Concreto$q$, $q$Bombeamento de concreto na obra; consulte a disponibilidade com a equipe.$q$),
  ($q$Argamassa para obra$q$, $q$Argamassa para obras residenciais e comerciais.$q$),
  ($q$Concreto com entrega$q$, $q$Concreto com entrega na obra; consulte as regiões atendidas.$q$),
  ($q$Fornecedor de concreto$q$, $q$Fornecedor de concreto usinado para construtoras, engenheiros e empreiteiros.$q$)
) as s(nome, descricao) where c.gbp_location = 'locations/11020380700238686765';
update public.clientes set servicos_padrao = 0 where gbp_location = 'locations/8993147300059940094';
insert into public.servicos (cliente_id, nome, descricao, status, origem)
select c.id, s.nome, s.descricao, 'no_perfil', 'perfil'
from public.clientes c, (values
  ($q$Marketing$q$, $q$Estratégia de marketing para negócios locais e regionais venderem mais.$q$),
  ($q$Tráfego pago$q$, $q$Gestão de tráfego pago estratégico para atrair clientes e gerar vendas.$q$),
  ($q$Gravação e edição de vídeos$q$, $q$Gravação no estúdio próprio da Marktiva e edição de vídeos para redes sociais e anúncios.$q$),
  ($q$Fotografia$q$, $q$Fotografia profissional para empresas, produtos e redes sociais.$q$),
  ($q$Programação de conteúdos em redes sociais$q$, $q$Planejamento e programação de conteúdos para as redes sociais da sua empresa.$q$),
  ($q$Consultoria de atendimento$q$, $q$Consultoria para melhorar o atendimento e a conversão de contatos em vendas.$q$),
  ($q$Estúdio fotográfico$q$, $q$Estúdio próprio na Gleba Palhano, em Londrina, para fotos e gravações.$q$),
  ($q$Criação de site$q$, $q$Criação de sites profissionais para empresas.$q$),
  ($q$Identidade visual$q$, $q$Criação de identidade visual para a marca da sua empresa.$q$),
  ($q$Gestão de redes sociais$q$, $q$Gestão completa de redes sociais, da criação de conteúdo à publicação.$q$),
  ($q$Automação de marketing$q$, $q$Automação de marketing para organizar o contato com clientes e potenciais clientes.$q$),
  ($q$Marketing digital para negócios locais$q$, $q$Marketing digital pensado para negócios locais e regionais.$q$)
) as s(nome, descricao) where c.gbp_location = 'locations/8993147300059940094';
update public.clientes set servicos_padrao = 1 where gbp_location = 'locations/11588371599993845343';
insert into public.servicos (cliente_id, nome, descricao, status, origem)
select c.id, s.nome, s.descricao, 'no_perfil', 'perfil'
from public.clientes c, (values
  ($q$Tratamento de canal$q$, $q$Tratamento endodôntico do dente, indicado após avaliação clínica.$q$),
  ($q$Cirurgia oral menor (terceiros molares)$q$, $q$Procedimento para a extração dos sisos (terceiros molares), indicado após avaliação clínica.$q$),
  ($q$Profilaxia$q$, $q$Limpeza profissional dos dentes para remover placa e tártaro.$q$),
  ($q$Restaurações diretas e indiretas$q$, $q$Restauração de dentes com resina (direta) ou com peças feitas em laboratório (indireta).$q$),
  ($q$Laminados Cerâmicos$q$, $q$Lâminas cerâmicas finas aplicadas aos dentes para fins estéticos, após avaliação.$q$),
  ($q$Lentes de contato dental$q$, $q$Lentes de contato dental: lâminas cerâmicas finas para fins estéticos, aplicadas após avaliação.$q$),
  ($q$Extração de siso$q$, $q$Extração dos dentes do siso, indicada após avaliação clínica.$q$),
  ($q$Limpeza dental$q$, $q$Limpeza dental profissional para manter a saúde da boca e dos dentes.$q$)
) as s(nome, descricao) where c.gbp_location = 'locations/11588371599993845343';
commit;
